package com.example

import android.Manifest
import android.annotation.SuppressLint
import android.content.ContentUris
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.JavascriptInterface
import android.webkit.MimeTypeMap
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewAssetLoader.AssetsPathHandler
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.FileInputStream
import java.io.InputStream
import android.os.ParcelFileDescriptor
import android.app.PictureInPictureParams
import android.content.Context
import android.content.ContentValues
import android.graphics.BitmapFactory
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.media.MediaMetadata
import android.os.PowerManager
import android.util.Base64
import android.widget.Toast

private class RangeStream(
    private val fis: FileInputStream,
    private val pfd: ParcelFileDescriptor,
    private val start: Long,
    private val contentLength: Long
) : InputStream() {
    private var skipped = false
    private var bytesLeft = contentLength

    override fun skip(n: Long): Long {
        if (!skipped && n == start) {
            // Chromium's AndroidStreamReaderURLRequestJob calling SkipToRequestedRange(start)
            skipped = true
            try {
                fis.channel.position(start)
            } catch (e: Exception) {
                var toSkip = start
                while (toSkip > 0) {
                    val s = fis.skip(toSkip)
                    if (s <= 0) break
                    toSkip -= s
                }
            }
            return n
        }
        val toSkip = minOf(n, bytesLeft).coerceAtLeast(0)
        val actuallySkipped = try {
            fis.skip(toSkip)
        } catch (e: Exception) {
            0L
        }
        if (actuallySkipped > 0) {
            bytesLeft -= actuallySkipped
        }
        return actuallySkipped
    }

    private fun ensurePosition() {
        if (!skipped && start > 0) {
            skipped = true
            try {
                fis.channel.position(start)
            } catch (e: Exception) {
                var toSkip = start
                while (toSkip > 0) {
                    val s = fis.skip(toSkip)
                    if (s <= 0) break
                    toSkip -= s
                }
            }
        }
    }

    override fun read(): Int {
        ensurePosition()
        if (bytesLeft <= 0) return -1
        val b = fis.read()
        if (b != -1) bytesLeft--
        return b
    }

    override fun read(b: ByteArray, off: Int, len: Int): Int {
        ensurePosition()
        if (bytesLeft <= 0) return -1
        val toRead = minOf(len.toLong(), bytesLeft).toInt()
        val readBytes = fis.read(b, off, toRead)
        if (readBytes > 0) {
            bytesLeft -= readBytes
        }
        return readBytes
    }

    override fun available(): Int {
        ensurePosition()
        val streamAvail = try { fis.available().toLong() } catch (e: Exception) { 0L }
        return minOf(streamAvail.coerceAtLeast(0), bytesLeft).toInt()
    }

    override fun close() {
        try { fis.close() } catch (ignored: Exception) {}
        try { pfd.close() } catch (ignored: Exception) {}
    }
}

class MainActivity : ComponentActivity() {

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null
    private lateinit var fullscreenContainer: FrameLayout
    private var webView: WebView? = null
    private var localMediaServer: LocalMediaServer? = null

    private val ACTION_PLAY = "com.example.ACTION_PLAY"
    private val ACTION_PAUSE = "com.example.ACTION_PAUSE"
    private val ACTION_NEXT = "com.example.ACTION_NEXT"
    private val ACTION_PREV = "com.example.ACTION_PREV"

    private val mediaActionReceiver = object : android.content.BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                ACTION_PLAY -> {
                    mediaSession?.controller?.transportControls?.play()
                    runOnUiThread { webView?.evaluateJavascript("window.onMediaSessionAction && window.onMediaSessionAction('play')", null) }
                }
                ACTION_PAUSE -> {
                    mediaSession?.controller?.transportControls?.pause()
                    runOnUiThread { webView?.evaluateJavascript("window.onMediaSessionAction && window.onMediaSessionAction('pause')", null) }
                }
                ACTION_NEXT -> {
                    mediaSession?.controller?.transportControls?.skipToNext()
                    runOnUiThread { webView?.evaluateJavascript("window.onMediaSessionAction && window.onMediaSessionAction('next')", null) }
                }
                ACTION_PREV -> {
                    mediaSession?.controller?.transportControls?.skipToPrevious()
                    runOnUiThread { webView?.evaluateJavascript("window.onMediaSessionAction && window.onMediaSessionAction('previous')", null) }
                }
            }
        }
    }

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        val granted = hasMediaPermission()
        runOnUiThread {
            webView?.evaluateJavascript(
                "window.onAndroidPermissionResult && window.onAndroidPermissionResult($granted)",
                null
            )
        }
    }

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val intent = result.data
            val results: Array<Uri>? = when {
                intent?.data != null -> arrayOf(intent.data!!)
                intent?.clipData != null -> {
                    val clipData = intent.clipData!!
                    Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
                }
                else -> null
            }
            filePathCallback?.onReceiveValue(results)
        } else {
            filePathCallback?.onReceiveValue(null)
        }
        filePathCallback = null
    }

    fun hasMediaPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= 34) {
            checkSelfPermission(Manifest.permission.READ_MEDIA_VIDEO) == PackageManager.PERMISSION_GRANTED ||
            checkSelfPermission("android.permission.READ_MEDIA_VISUAL_USER_SELECTED") == PackageManager.PERMISSION_GRANTED
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            checkSelfPermission(Manifest.permission.READ_MEDIA_VIDEO) == PackageManager.PERMISSION_GRANTED
        } else {
            checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED
        }
    }

    fun requestMediaPermission() {
        runOnUiThread {
            val perms = if (Build.VERSION.SDK_INT >= 34) {
                arrayOf(
                    Manifest.permission.READ_MEDIA_VIDEO,
                    Manifest.permission.READ_MEDIA_AUDIO,
                    Manifest.permission.READ_MEDIA_IMAGES,
                    "android.permission.READ_MEDIA_VISUAL_USER_SELECTED"
                )
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                arrayOf(
                    Manifest.permission.READ_MEDIA_VIDEO,
                    Manifest.permission.READ_MEDIA_AUDIO,
                    Manifest.permission.READ_MEDIA_IMAGES
                )
            } else {
                arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
            permissionLauncher.launch(perms)
        }
    }

    override fun onResume() {
        super.onResume()
        if (hasMediaPermission()) {
            runOnUiThread {
                webView?.evaluateJavascript(
                    "window.onAndroidPermissionResult && window.onAndroidPermissionResult(true)",
                    null
                )
            }
        }
    }

    fun queryDeviceVideosJson(): String {
        val jsonArray = JSONArray()
        if (!hasMediaPermission()) {
            return jsonArray.toString()
        }

        val projection = arrayOf(
            MediaStore.Video.Media._ID,
            MediaStore.Video.Media.DISPLAY_NAME,
            MediaStore.Video.Media.TITLE,
            MediaStore.Video.Media.DURATION,
            MediaStore.Video.Media.SIZE,
            MediaStore.Video.Media.DATE_ADDED,
            MediaStore.Video.Media.DATE_MODIFIED,
            MediaStore.Video.Media.WIDTH,
            MediaStore.Video.Media.HEIGHT,
            MediaStore.Video.Media.MIME_TYPE,
            MediaStore.Video.Media.BUCKET_DISPLAY_NAME
        )

        val sortOrder = "${MediaStore.Video.Media.DATE_ADDED} DESC"

        try {
            contentResolver.query(
                MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                projection,
                null,
                null,
                sortOrder
            )?.use { cursor ->
                val idCol = cursor.getColumnIndex(MediaStore.Video.Media._ID)
                val nameCol = cursor.getColumnIndex(MediaStore.Video.Media.DISPLAY_NAME)
                val titleCol = cursor.getColumnIndex(MediaStore.Video.Media.TITLE)
                val durationCol = cursor.getColumnIndex(MediaStore.Video.Media.DURATION)
                val sizeCol = cursor.getColumnIndex(MediaStore.Video.Media.SIZE)
                val dateAddedCol = cursor.getColumnIndex(MediaStore.Video.Media.DATE_ADDED)
                val dateModifiedCol = cursor.getColumnIndex(MediaStore.Video.Media.DATE_MODIFIED)
                val widthCol = cursor.getColumnIndex(MediaStore.Video.Media.WIDTH)
                val heightCol = cursor.getColumnIndex(MediaStore.Video.Media.HEIGHT)
                val mimeCol = cursor.getColumnIndex(MediaStore.Video.Media.MIME_TYPE)
                val bucketCol = cursor.getColumnIndex(MediaStore.Video.Media.BUCKET_DISPLAY_NAME)

                while (cursor.moveToNext()) {
                    val id = if (idCol >= 0) cursor.getLong(idCol) else -1L
                    if (id < 0) continue

                    val displayName = if (nameCol >= 0) cursor.getString(nameCol) ?: "Video_$id" else "Video_$id"
                    val title = if (titleCol >= 0) cursor.getString(titleCol) ?: displayName else displayName
                    val durationMs = if (durationCol >= 0) cursor.getLong(durationCol) else 0L
                    val sizeBytes = if (sizeCol >= 0) cursor.getLong(sizeCol) else 0L
                    val dateAddedSec = if (dateAddedCol >= 0) cursor.getLong(dateAddedCol) else 0L
                    val dateModifiedSec = if (dateModifiedCol >= 0) cursor.getLong(dateModifiedCol) else 0L
                    val width = if (widthCol >= 0) cursor.getInt(widthCol) else 0
                    val height = if (heightCol >= 0) cursor.getInt(heightCol) else 0
                    val mimeType = if (mimeCol >= 0) cursor.getString(mimeCol) ?: "video/mp4" else "video/mp4"
                    val bucketName = if (bucketCol >= 0) cursor.getString(bucketCol) ?: "Videos" else "Videos"

                    val format = if (displayName.contains(".")) {
                        displayName.substringAfterLast(".", "mp4").lowercase()
                    } else {
                        mimeType.substringAfterLast("/", "mp4")
                    }

                    val serverPort = localMediaServer?.port ?: 0
                    val videoUrl = if (serverPort > 0) {
                        "http://127.0.0.1:$serverPort/local-media/$id"
                    } else {
                        "https://appassets.androidplatform.net/local-media/$id"
                    }
                    val thumbUrl = if (serverPort > 0) {
                        "http://127.0.0.1:$serverPort/local-thumbnail/$id"
                    } else {
                        "https://appassets.androidplatform.net/local-thumbnail/$id"
                    }

                    val item = JSONObject().apply {
                        put("id", "device-$id")
                        put("mediaId", id)
                        put("title", title.ifEmpty { displayName.substringBeforeLast(".") })
                        put("url", videoUrl)
                        put("thumbnailUrl", thumbUrl)
                        put("type", "video")
                        put("format", format)
                        put("duration", durationMs / 1000.0)
                        put("size", sizeBytes)
                        put("dateAdded", if (dateAddedSec > 0) dateAddedSec * 1000L else System.currentTimeMillis())
                        put("dateModified", if (dateModifiedSec > 0) dateModifiedSec * 1000L else System.currentTimeMillis())
                        put("folder", bucketName)
                        val resObj = JSONObject().apply {
                            put("width", width)
                            put("height", height)
                        }
                        put("resolution", resObj)
                    }
                    jsonArray.put(item)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        return jsonArray.toString()
    }

    var isVideoPlaying = false
    private var isAudioMode = false
    private var mediaSession: MediaSession? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private val NOTIFICATION_CHANNEL_ID = "matrix_media_playback"
    private val NOTIFICATION_ID = 1001

    fun saveScreenshotBitmap(base64Data: String, title: String): Boolean {
        return try {
            val cleanBase64 = if (base64Data.contains(",")) {
                base64Data.substringAfter(",")
            } else {
                base64Data
            }
            val decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size) ?: return false

            val filename = "Matrix_${System.currentTimeMillis()}.png"
            val values = ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, filename)
                put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/MatrixPlayer")
                    put(MediaStore.Images.Media.IS_PENDING, 1)
                }
            }

            val uri = contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
            if (uri != null) {
                contentResolver.openOutputStream(uri)?.use { out ->
                    bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    values.clear()
                    values.put(MediaStore.Images.Media.IS_PENDING, 0)
                    contentResolver.update(uri, values, null, null)
                }
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Frame captured and saved to Gallery", Toast.LENGTH_SHORT).show()
                }
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    fun enterPictureInPictureModeCompat(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return try {
                val params = PictureInPictureParams.Builder()
                    .setAspectRatio(android.util.Rational(16, 9))
                    .build()
                enterPictureInPictureMode(params)
            } catch (e: Exception) {
                false
            }
        }
        return false
    }

    fun updatePipParams(playing: Boolean) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                setPictureInPictureParams(
                    PictureInPictureParams.Builder()
                        .setAspectRatio(android.util.Rational(16, 9))
                        .setAutoEnterEnabled(playing)
                        .build()
                )
            } catch (e: Exception) {}
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (isVideoPlaying && !isInPictureInPictureModeCompat()) {
            enterPictureInPictureModeCompat()
        }
    }

    private fun isInPictureInPictureModeCompat(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            isInPictureInPictureMode
        } else {
            false
        }
    }

    override fun onPictureInPictureModeChanged(
        isInPictureInPictureMode: Boolean,
        newConfig: android.content.res.Configuration
    ) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        runOnUiThread {
            webView?.evaluateJavascript(
                "window.onPictureInPictureChanged && window.onPictureInPictureChanged($isInPictureInPictureMode)",
                null
            )
        }
    }

    private fun setupMediaSession() {
        if (mediaSession != null) return
        mediaSession = MediaSession(this, "MatrixPlayerSession").apply {
            setCallback(object : MediaSession.Callback() {
                override fun onPlay() {
                    runOnUiThread {
                        webView?.evaluateJavascript("window.onMediaSessionAction && window.onMediaSessionAction('play')", null)
                    }
                }

                override fun onPause() {
                    runOnUiThread {
                        webView?.evaluateJavascript("window.onMediaSessionAction && window.onMediaSessionAction('pause')", null)
                    }
                }

                override fun onSkipToNext() {
                    runOnUiThread {
                        webView?.evaluateJavascript("window.onMediaSessionAction && window.onMediaSessionAction('next')", null)
                    }
                }

                override fun onSkipToPrevious() {
                    runOnUiThread {
                        webView?.evaluateJavascript("window.onMediaSessionAction && window.onMediaSessionAction('previous')", null)
                    }
                }

                override fun onSeekTo(pos: Long) {
                    val sec = pos / 1000.0
                    runOnUiThread {
                        webView?.evaluateJavascript("window.onMediaSessionAction && window.onMediaSessionAction('seek', $sec)", null)
                    }
                }
            })
            isActive = true
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = android.app.NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Matrix Media Playback",
                android.app.NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Playback controls and progress for Matrix Player"
                setShowBadge(false)
            }
            val nm = getSystemService(android.app.NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    fun startAudioMode(title: String, artist: String, durationSec: Double, positionSec: Double, isPlaying: Boolean) {
        isAudioMode = true
        setupMediaSession()

        if (wakeLock == null) {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "MatrixPlayer:AudioModeWakeLock")
        }
        if (wakeLock?.isHeld == false) {
            try {
                wakeLock?.acquire(24 * 60 * 60 * 1000L)
            } catch (ignored: Exception) {}
        }

        updateMediaSessionState(title, artist, durationSec, positionSec, isPlaying)
    }

    fun updatePlaybackState(isPlaying: Boolean, positionSec: Double) {
        this.isVideoPlaying = isPlaying
        updatePipParams(isPlaying)
        if (isAudioMode && mediaSession != null) {
            updateMediaSessionPlaybackState(isPlaying, positionSec)
        }
    }

    fun stopAudioMode() {
        isAudioMode = false
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (ignored: Exception) {}
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
        nm.cancel(NOTIFICATION_ID)
    }

    private fun updateMediaSessionState(title: String, artist: String, durationSec: Double, positionSec: Double, isPlaying: Boolean) {
        val session = mediaSession ?: return
        val durationMs = (durationSec * 1000).toLong().coerceAtLeast(0L)
        val metadata = MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, title)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, artist.ifEmpty { "Matrix Player" })
            .putLong(MediaMetadata.METADATA_KEY_DURATION, durationMs)
            .build()
        session.setMetadata(metadata)

        updateMediaSessionPlaybackState(isPlaying, positionSec)
        postMediaNotification(title, artist, isPlaying)
    }

    private fun updateMediaSessionPlaybackState(isPlaying: Boolean, positionSec: Double) {
        val session = mediaSession ?: return
        val posMs = (positionSec * 1000).toLong().coerceAtLeast(0L)
        val state = PlaybackState.Builder()
            .setActions(
                PlaybackState.ACTION_PLAY or
                PlaybackState.ACTION_PAUSE or
                PlaybackState.ACTION_SKIP_TO_NEXT or
                PlaybackState.ACTION_SKIP_TO_PREVIOUS or
                PlaybackState.ACTION_SEEK_TO
            )
            .setState(
                if (isPlaying) PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED,
                posMs,
                1.0f
            )
            .build()
        session.setPlaybackState(state)
    }

    private fun postMediaNotification(title: String, artist: String, isPlaying: Boolean) {
        val session = mediaSession ?: return
        val contentIntent = android.app.PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) android.app.PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val prevIntent = Intent(ACTION_PREV).setPackage(packageName)
        val prevPI = android.app.PendingIntent.getBroadcast(
            this, 1, prevIntent,
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) android.app.PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val playPauseAction = if (isPlaying) ACTION_PAUSE else ACTION_PLAY
        val playPauseIntent = Intent(playPauseAction).setPackage(packageName)
        val playPausePI = android.app.PendingIntent.getBroadcast(
            this, 2, playPauseIntent,
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) android.app.PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val nextIntent = Intent(ACTION_NEXT).setPackage(packageName)
        val nextPI = android.app.PendingIntent.getBroadcast(
            this, 3, nextIntent,
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) android.app.PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            android.app.Notification.Builder(this, NOTIFICATION_CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            android.app.Notification.Builder(this)
        }

        builder.setContentTitle(title)
            .setContentText(artist.ifEmpty { "Matrix Player" })
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(contentIntent)
            .setVisibility(android.app.Notification.VISIBILITY_PUBLIC)
            .setOngoing(isPlaying)
            .addAction(android.R.drawable.ic_media_previous, "Previous", prevPI)
            .addAction(if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play, if (isPlaying) "Pause" else "Play", playPausePI)
            .addAction(android.R.drawable.ic_media_next, "Next", nextPI)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            builder.style = android.app.Notification.MediaStyle()
                .setMediaSession(session.sessionToken)
                .setShowActionsInCompactView(0, 1, 2)
        }

        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
        try {
            nm.notify(NOTIFICATION_ID, builder.build())
        } catch (ignored: Exception) {}
    }

    override fun onDestroy() {
        stopAudioMode()
        try {
            unregisterReceiver(mediaActionReceiver)
        } catch (ignored: Exception) {}
        try {
            localMediaServer?.stop()
        } catch (ignored: Exception) {}
        localMediaServer = null
        try {
            mediaSession?.release()
        } catch (ignored: Exception) {}
        mediaSession = null
        super.onDestroy()
    }

    inner class AndroidMediaBridge {
        @JavascriptInterface
        fun hasPermission(): Boolean {
            return this@MainActivity.hasMediaPermission()
        }

        @JavascriptInterface
        fun requestPermission() {
            this@MainActivity.requestMediaPermission()
        }

        @JavascriptInterface
        fun getVideosJson(): String {
            return this@MainActivity.queryDeviceVideosJson()
        }

        @JavascriptInterface
        fun getLocalServerPort(): Int {
            return localMediaServer?.port ?: 0
        }

        @JavascriptInterface
        fun toggleOrientation() {
            runOnUiThread {
                val isPortrait = resources.configuration.orientation == android.content.res.Configuration.ORIENTATION_PORTRAIT
                requestedOrientation = if (isPortrait) {
                    ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                } else {
                    ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                }
            }
        }

        @JavascriptInterface
        fun setOrientation(mode: String) {
            runOnUiThread {
                requestedOrientation = when (mode.lowercase()) {
                    "landscape" -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                    "portrait" -> ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                    "sensor", "auto" -> ActivityInfo.SCREEN_ORIENTATION_SENSOR
                    else -> ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                }
            }
        }

        @JavascriptInterface
        fun saveScreenshot(base64Data: String, title: String): Boolean {
            return this@MainActivity.saveScreenshotBitmap(base64Data, title)
        }

        @JavascriptInterface
        fun enterPip(): Boolean {
            runOnUiThread {
                this@MainActivity.enterPictureInPictureModeCompat()
            }
            return true
        }

        @JavascriptInterface
        fun setPlayingState(playing: Boolean) {
            this@MainActivity.isVideoPlaying = playing
            this@MainActivity.updatePipParams(playing)
        }

        @JavascriptInterface
        fun startAudioMode(title: String, artist: String, durationSec: Double, positionSec: Double, isPlaying: Boolean) {
            this@MainActivity.startAudioMode(title, artist, durationSec, positionSec, isPlaying)
        }

        @JavascriptInterface
        fun updatePlaybackState(isPlaying: Boolean, positionSec: Double) {
            this@MainActivity.updatePlaybackState(isPlaying, positionSec)
        }

        @JavascriptInterface
        fun stopAudioMode() {
            this@MainActivity.stopAudioMode()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        try {
            localMediaServer = LocalMediaServer(this).apply { start() }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        val filter = android.content.IntentFilter().apply {
            addAction(ACTION_PLAY)
            addAction(ACTION_PAUSE)
            addAction(ACTION_NEXT)
            addAction(ACTION_PREV)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(mediaActionReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(mediaActionReceiver, filter)
        }

        fullscreenContainer = FrameLayout(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            visibility = View.GONE
            setBackgroundColor(android.graphics.Color.BLACK)
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (customView != null) {
                    hideCustomView()
                    return
                }
                
                // Query webview to handle step-by-step back navigation
                webView?.evaluateJavascript(
                    "(function() { return window.handleAndroidBack ? window.handleAndroidBack() : false; })()"
                ) { result ->
                    val handled = result?.trim('"', ' ', '\'') == "true"
                    if (!handled) {
                        runOnUiThread {
                            if (webView?.canGoBack() == true) {
                                webView?.goBack()
                            } else {
                                moveTaskToBack(true)
                            }
                        }
                    }
                }
            }
        })

        setContent {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black)
            ) {
                MatrixWebViewContainer()
            }
        }

        // Add fullscreen container above compose view
        addContentView(
            fullscreenContainer,
            ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Composable
    private fun MatrixWebViewContainer() {
        val assetLoader = remember {
            WebViewAssetLoader.Builder()
                .setDomain("appassets.androidplatform.net")
                .addPathHandler("/assets/", AssetsPathHandler(this@MainActivity))
                .build()
        }

        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { context ->
                WebView(context).apply {
                    webView = this
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    setBackgroundColor(android.graphics.Color.BLACK)

                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        mediaPlaybackRequiresUserGesture = false
                        allowFileAccess = true
                        allowContentAccess = true
                        useWideViewPort = true
                        loadWithOverviewMode = true
                        cacheMode = WebSettings.LOAD_DEFAULT
                        mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                    }

                    addJavascriptInterface(AndroidMediaBridge(), "AndroidMedia")

                    webViewClient = object : WebViewClient() {
                        override fun shouldInterceptRequest(
                            view: WebView?,
                            request: WebResourceRequest?
                        ): WebResourceResponse? {
                            val url = request?.url ?: return null
                            val path = url.path ?: ""

                            // 1. Intercept local media stream (/local-media/{id}) with partial content (Range) support
                            if (path.startsWith("/local-media/")) {
                                val idStr = path.substringAfter("/local-media/").substringBefore("/").substringBefore(".")
                                val mediaId = idStr.toLongOrNull() ?: return null
                                val contentUri = ContentUris.withAppendedId(
                                    MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                                    mediaId
                                )

                                val pfd = try {
                                    contentResolver.openFileDescriptor(contentUri, "r")
                                } catch (e: Exception) {
                                    null
                                } ?: return null

                                val fis = FileInputStream(pfd.fileDescriptor)
                                val statSize = pfd.statSize
                                var totalLength = if (statSize > 0) statSize else {
                                    try { fis.channel.size() } catch (e: Exception) { -1L }
                                }
                                if (totalLength <= 0) {
                                    try {
                                        contentResolver.query(contentUri, arrayOf(MediaStore.Video.Media.SIZE), null, null, null)?.use { c ->
                                            if (c.moveToFirst()) {
                                                totalLength = c.getLong(c.getColumnIndexOrThrow(MediaStore.Video.Media.SIZE))
                                            }
                                        }
                                    } catch (ignored: Exception) {}
                                }
                                if (totalLength <= 0) {
                                    totalLength = 100_000_000L
                                }

                                var mimeType = contentResolver.getType(contentUri)
                                if (mimeType.isNullOrEmpty() || mimeType == "application/octet-stream") {
                                    try {
                                        contentResolver.query(
                                            contentUri,
                                            arrayOf(MediaStore.Video.Media.MIME_TYPE, MediaStore.Video.Media.DISPLAY_NAME),
                                            null, null, null
                                        )?.use { c ->
                                            if (c.moveToFirst()) {
                                                val dbMime = c.getString(c.getColumnIndexOrThrow(MediaStore.Video.Media.MIME_TYPE))
                                                if (!dbMime.isNullOrEmpty()) {
                                                    mimeType = dbMime
                                                } else {
                                                    val name = c.getString(c.getColumnIndexOrThrow(MediaStore.Video.Media.DISPLAY_NAME)) ?: ""
                                                    val ext = name.substringAfterLast('.', "").lowercase()
                                                    if (ext.isNotEmpty()) {
                                                        mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext)
                                                    }
                                                }
                                            }
                                        }
                                    } catch (ignored: Exception) {}
                                }
                                val resolvedMime: String = mimeType?.substringBefore(";")?.trim()?.ifEmpty { "video/mp4" } ?: "video/mp4"

                                // Handle OPTIONS preflight request
                                if (request.method.equals("OPTIONS", ignoreCase = true)) {
                                    val headers = mutableMapOf(
                                        "Access-Control-Allow-Origin" to "*",
                                        "Access-Control-Allow-Methods" to "GET, HEAD, OPTIONS",
                                        "Access-Control-Allow-Headers" to "*",
                                        "Access-Control-Max-Age" to "86400"
                                    )
                                    try { pfd.close() } catch (ignored: Exception) {}
                                    try { fis.close() } catch (ignored: Exception) {}
                                    return WebResourceResponse("text/plain", "UTF-8", 200, "OK", headers, ByteArrayInputStream(ByteArray(0)))
                                }

                                // Handle HEAD request
                                val isHead = request.method.equals("HEAD", ignoreCase = true)
                                if (isHead) {
                                    val headers = mutableMapOf(
                                        "Accept-Ranges" to "bytes",
                                        "Content-Length" to totalLength.toString(),
                                        "Access-Control-Allow-Origin" to "*",
                                        "Access-Control-Allow-Methods" to "GET, HEAD, OPTIONS",
                                        "Access-Control-Allow-Headers" to "*",
                                        "Content-Type" to resolvedMime
                                    )
                                    try { pfd.close() } catch (ignored: Exception) {}
                                    try { fis.close() } catch (ignored: Exception) {}
                                    return WebResourceResponse(resolvedMime, null, 200, "OK", headers, ByteArrayInputStream(ByteArray(0)))
                                }

                                // Parse Range header if present
                                val rangeHeader = request.requestHeaders?.entries?.firstOrNull {
                                    it.key.equals("Range", ignoreCase = true)
                                }?.value

                                if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                                    val rangePart = rangeHeader.substringAfter("bytes=").trim()
                                    val (start, end) = if (rangePart.startsWith("-")) {
                                        val suffix = rangePart.substring(1).toLongOrNull() ?: 0L
                                        val s = (totalLength - suffix).coerceAtLeast(0L)
                                        s to (totalLength - 1)
                                    } else {
                                        val parts = rangePart.split("-")
                                        val s = parts[0].toLongOrNull() ?: 0L
                                        val e = if (parts.size > 1 && parts[1].isNotEmpty()) {
                                            parts[1].toLongOrNull() ?: (totalLength - 1)
                                        } else {
                                            totalLength - 1
                                        }
                                        s to e.coerceAtMost(totalLength - 1)
                                    }

                                    val contentLength = (end - start + 1).coerceAtLeast(0)
                                    val rangeStream = RangeStream(fis, pfd, start, contentLength)

                                    val headers = mutableMapOf(
                                        "Content-Range" to "bytes $start-$end/$totalLength",
                                        "Accept-Ranges" to "bytes",
                                        "Content-Length" to contentLength.toString(),
                                        "Access-Control-Allow-Origin" to "*",
                                        "Access-Control-Allow-Methods" to "GET, HEAD, OPTIONS",
                                        "Access-Control-Allow-Headers" to "*",
                                        "Content-Type" to resolvedMime
                                    )
                                    return WebResourceResponse(resolvedMime, null, 206, "Partial Content", headers, rangeStream)
                                } else {
                                    val rangeStream = RangeStream(fis, pfd, 0L, totalLength)
                                    val headers = mutableMapOf(
                                        "Accept-Ranges" to "bytes",
                                        "Content-Length" to totalLength.toString(),
                                        "Access-Control-Allow-Origin" to "*",
                                        "Access-Control-Allow-Methods" to "GET, HEAD, OPTIONS",
                                        "Access-Control-Allow-Headers" to "*",
                                        "Content-Type" to resolvedMime
                                    )
                                    return WebResourceResponse(resolvedMime, null, 200, "OK", headers, rangeStream)
                                }
                            }

                            // 2. Intercept local video thumbnail (/local-thumbnail/{id})
                            if (path.startsWith("/local-thumbnail/")) {
                                val idStr = path.substringAfter("/local-thumbnail/").substringBefore("/")
                                val mediaId = idStr.toLongOrNull() ?: return null
                                val contentUri = ContentUris.withAppendedId(
                                    MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                                    mediaId
                                )

                                try {
                                    val bitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                        contentResolver.loadThumbnail(contentUri, android.util.Size(320, 180), null)
                                    } else {
                                        @Suppress("DEPRECATION")
                                        MediaStore.Video.Thumbnails.getThumbnail(
                                            contentResolver,
                                            mediaId,
                                            MediaStore.Video.Thumbnails.MINI_KIND,
                                            null
                                        )
                                    }
                                    if (bitmap != null) {
                                        val baos = ByteArrayOutputStream()
                                        bitmap.compress(Bitmap.CompressFormat.JPEG, 85, baos)
                                        val bytes = baos.toByteArray()
                                        val headers = mapOf(
                                            "Content-Length" to bytes.size.toString(),
                                            "Access-Control-Allow-Origin" to "*",
                                            "Cache-Control" to "max-age=86400"
                                        )
                                        return WebResourceResponse(
                                            "image/jpeg",
                                            null,
                                            200,
                                            "OK",
                                            headers,
                                            ByteArrayInputStream(bytes)
                                        )
                                    }
                                } catch (e: Exception) {
                                    // Ignore and fallback
                                }
                            }

                            return assetLoader.shouldInterceptRequest(url)
                        }

                        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                            super.onPageStarted(view, url, favicon)
                        }
                    }

                    webChromeClient = object : WebChromeClient() {
                        override fun onShowCustomView(
                            view: View?,
                            callback: CustomViewCallback?
                        ) {
                            if (customView != null) {
                                callback?.onCustomViewHidden()
                                return
                            }
                            customView = view
                            customViewCallback = callback
                            fullscreenContainer.addView(
                                view,
                                ViewGroup.LayoutParams(
                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                    ViewGroup.LayoutParams.MATCH_PARENT
                                )
                            )
                            fullscreenContainer.visibility = View.VISIBLE
                            this@apply.visibility = View.GONE
                            setImmersiveFullscreen(true)
                        }

                        override fun onHideCustomView() {
                            hideCustomView()
                        }

                        override fun onShowFileChooser(
                            webView: WebView?,
                            filePathCallback: ValueCallback<Array<Uri>>?,
                            fileChooserParams: FileChooserParams?
                        ): Boolean {
                            this@MainActivity.filePathCallback?.onReceiveValue(null)
                            this@MainActivity.filePathCallback = filePathCallback

                            val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                                type = "*/*"
                                addCategory(Intent.CATEGORY_OPENABLE)
                                putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                            }

                            try {
                                fileChooserLauncher.launch(intent)
                            } catch (e: Exception) {
                                this@MainActivity.filePathCallback = null
                                return false
                            }
                            return true
                        }

                        override fun onPermissionRequest(request: PermissionRequest?) {
                            request?.grant(request.resources)
                        }
                    }

                    loadUrl("https://appassets.androidplatform.net/assets/web/index.html")
                }
            }
        )

        DisposableEffect(Unit) {
            onDispose {
                webView?.destroy()
                webView = null
            }
        }
    }

    private fun hideCustomView() {
        if (customView == null) return
        fullscreenContainer.visibility = View.GONE
        fullscreenContainer.removeView(customView)
        customView = null
        customViewCallback?.onCustomViewHidden()
        customViewCallback = null
        webView?.visibility = View.VISIBLE
        setImmersiveFullscreen(false)
    }

    private fun setImmersiveFullscreen(fullscreen: Boolean) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let { controller ->
                if (fullscreen) {
                    controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                    controller.systemBarsBehavior =
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                } else {
                    controller.show(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                }
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = if (fullscreen) {
                (View.SYSTEM_UI_FLAG_FULLSCREEN
                        or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY)
            } else {
                View.SYSTEM_UI_FLAG_VISIBLE
            }
        }
    }
}
