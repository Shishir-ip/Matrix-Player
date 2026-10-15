package com.example

import android.content.ContentUris
import android.content.Context
import android.graphics.Bitmap
import android.os.Build
import android.provider.MediaStore
import android.webkit.MimeTypeMap
import java.io.BufferedReader
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.FileInputStream
import java.io.InputStreamReader
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.nio.charset.StandardCharsets
import java.util.concurrent.Executors

/**
 * High-performance embedded HTTP loopback media server on 127.0.0.1.
 * Provides standard RFC 7233 HTTP 206 Partial Content (Byte Range) streaming
 * directly over TCP sockets to bypass Android WebView's internal shouldInterceptRequest
 * range bugs and eliminate buffering stalls on local media.
 */
class LocalMediaServer(private val context: Context) {

    private var serverSocket: ServerSocket? = null
    var port: Int = 0
        private set
    private var isRunning = false
    private val executor = Executors.newCachedThreadPool()

    fun start() {
        if (isRunning) return
        try {
            val loopback = InetAddress.getByName("127.0.0.1")
            serverSocket = ServerSocket(0, 50, loopback).apply {
                reuseAddress = true
            }
            port = serverSocket!!.localPort
            isRunning = true

            Thread({
                while (isRunning) {
                    try {
                        val socket = serverSocket?.accept() ?: break
                        executor.execute { handleSocket(socket) }
                    } catch (e: Exception) {
                        if (!isRunning) break
                    }
                }
            }, "LocalMediaServerThread").start()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun stop() {
        isRunning = false
        try {
            serverSocket?.close()
        } catch (ignored: Exception) {}
        executor.shutdownNow()
    }

    private fun handleSocket(socket: Socket) {
        try {
            socket.soTimeout = 15000
            val input = socket.getInputStream()
            val reader = BufferedReader(InputStreamReader(input, StandardCharsets.UTF_8))
            val requestLine = reader.readLine() ?: run {
                socket.close()
                return
            }

            val parts = requestLine.split(" ")
            if (parts.size < 2) {
                socket.close()
                return
            }

            val method = parts[0].uppercase()
            val uriPath = parts[1]

            var rangeHeader: String? = null
            while (true) {
                val line = reader.readLine() ?: break
                if (line.isEmpty()) break
                if (line.startsWith("Range:", ignoreCase = true)) {
                    rangeHeader = line.substringAfter(":").trim()
                }
            }

            val out = socket.getOutputStream()

            // Handle CORS preflight
            if (method == "OPTIONS") {
                val response = "HTTP/1.1 200 OK\r\n" +
                        "Access-Control-Allow-Origin: *\r\n" +
                        "Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n" +
                        "Access-Control-Allow-Headers: Range, Content-Type, Accept-Encoding\r\n" +
                        "Access-Control-Max-Age: 86400\r\n" +
                        "Content-Length: 0\r\n\r\n"
                out.write(response.toByteArray(StandardCharsets.UTF_8))
                out.flush()
                socket.close()
                return
            }

            // Thumbnail endpoint (/local-thumbnail/{id})
            if (uriPath.startsWith("/local-thumbnail/")) {
                val idStr = uriPath.substringAfter("/local-thumbnail/").substringBefore("?")
                val mediaId = idStr.toLongOrNull()
                if (mediaId != null) {
                    val contentUri = ContentUris.withAppendedId(
                        MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                        mediaId
                    )
                    val bitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        try {
                            context.contentResolver.loadThumbnail(contentUri, android.util.Size(320, 180), null)
                        } catch (e: Exception) {
                            null
                        }
                    } else {
                        @Suppress("DEPRECATION")
                        try {
                            MediaStore.Video.Thumbnails.getThumbnail(
                                context.contentResolver,
                                mediaId,
                                MediaStore.Video.Thumbnails.MINI_KIND,
                                null
                            )
                        } catch (e: Exception) {
                            null
                        }
                    }

                    if (bitmap != null) {
                        val baos = ByteArrayOutputStream()
                        bitmap.compress(Bitmap.CompressFormat.JPEG, 85, baos)
                        val bytes = baos.toByteArray()
                        val header = "HTTP/1.1 200 OK\r\n" +
                                "Content-Type: image/jpeg\r\n" +
                                "Content-Length: ${bytes.size}\r\n" +
                                "Access-Control-Allow-Origin: *\r\n" +
                                "Cache-Control: max-age=86400\r\n\r\n"
                        out.write(header.toByteArray(StandardCharsets.UTF_8))
                        out.write(bytes)
                        out.flush()
                        socket.close()
                        return
                    }
                }
            }

            // Media stream endpoint (/local-media/{id})
            if (uriPath.startsWith("/local-media/")) {
                val idStr = uriPath.substringAfter("/local-media/").substringBefore("?")
                val mediaId = idStr.toLongOrNull() ?: run {
                    send404(out, socket)
                    return
                }

                val contentUri = ContentUris.withAppendedId(
                    MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                    mediaId
                )

                val pfd = try {
                    context.contentResolver.openFileDescriptor(contentUri, "r")
                } catch (e: Exception) {
                    null
                } ?: run {
                    send404(out, socket)
                    return
                }

                pfd.use { parcelFd ->
                    val fis = FileInputStream(parcelFd.fileDescriptor)
                    val channel = fis.channel
                    val statSize = parcelFd.statSize
                    var totalLength = if (statSize > 0) statSize else {
                        try { channel.size() } catch (e: Exception) { -1L }
                    }

                    if (totalLength <= 0) {
                        try {
                            context.contentResolver.query(
                                contentUri,
                                arrayOf(MediaStore.Video.Media.SIZE),
                                null, null, null
                            )?.use { c ->
                                if (c.moveToFirst()) {
                                    totalLength = c.getLong(c.getColumnIndexOrThrow(MediaStore.Video.Media.SIZE))
                                }
                            }
                        } catch (ignored: Exception) {}
                    }

                    if (totalLength <= 0) {
                        totalLength = 100_000_000L
                    }

                    var mimeType = context.contentResolver.getType(contentUri)
                    if (mimeType.isNullOrEmpty() || mimeType == "application/octet-stream") {
                        try {
                            context.contentResolver.query(
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

                    if (mimeType.isNullOrEmpty()) {
                        mimeType = "video/mp4"
                    }

                    if (method == "HEAD") {
                        val header = "HTTP/1.1 200 OK\r\n" +
                                "Content-Type: $mimeType\r\n" +
                                "Content-Length: $totalLength\r\n" +
                                "Accept-Ranges: bytes\r\n" +
                                "Access-Control-Allow-Origin: *\r\n\r\n"
                        out.write(header.toByteArray(StandardCharsets.UTF_8))
                        out.flush()
                        socket.close()
                        return
                    }

                    var start = 0L
                    var end = totalLength - 1L
                    var isPartial = false

                    if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                        val rangePart = rangeHeader.substringAfter("bytes=").trim()
                        val dashIdx = rangePart.indexOf('-')
                        if (dashIdx >= 0) {
                            val startStr = rangePart.substring(0, dashIdx).trim()
                            val endStr = rangePart.substring(dashIdx + 1).trim()
                            if (startStr.isEmpty()) {
                                val suffix = endStr.toLongOrNull() ?: 0L
                                start = (totalLength - suffix).coerceAtLeast(0L)
                                end = totalLength - 1L
                            } else {
                                start = startStr.toLongOrNull() ?: 0L
                                if (endStr.isNotEmpty()) {
                                    end = endStr.toLongOrNull() ?: (totalLength - 1L)
                                }
                            }
                            isPartial = true
                        }
                    }

                    if (start >= totalLength) {
                        val notSatisfiable = "HTTP/1.1 416 Range Not Satisfiable\r\n" +
                                "Content-Range: bytes */$totalLength\r\n" +
                                "Content-Length: 0\r\n\r\n"
                        out.write(notSatisfiable.toByteArray(StandardCharsets.UTF_8))
                        out.flush()
                        socket.close()
                        return
                    }

                    val contentLength = (end - start + 1L).coerceAtLeast(0L)

                    val statusLine = if (isPartial) "HTTP/1.1 206 Partial Content\r\n" else "HTTP/1.1 200 OK\r\n"
                    val contentRangeHeader = if (isPartial) "Content-Range: bytes $start-$end/$totalLength\r\n" else ""
                    val headers = statusLine +
                            "Content-Type: $mimeType\r\n" +
                            "Content-Length: $contentLength\r\n" +
                            contentRangeHeader +
                            "Accept-Ranges: bytes\r\n" +
                            "Access-Control-Allow-Origin: *\r\n" +
                            "Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n" +
                            "Access-Control-Allow-Headers: Range, Content-Type, Accept-Encoding\r\n" +
                            "Connection: close\r\n\r\n"

                    out.write(headers.toByteArray(StandardCharsets.UTF_8))
                    out.flush()

                    // Stream video bytes directly from file channel to socket
                    channel.position(start)
                    val buffer = ByteArray(65536)
                    var bytesRemaining = contentLength
                    while (bytesRemaining > 0) {
                        val toRead = minOf(buffer.size.toLong(), bytesRemaining).toInt()
                        val bytesRead = fis.read(buffer, 0, toRead)
                        if (bytesRead <= 0) break
                        out.write(buffer, 0, bytesRead)
                        bytesRemaining -= bytesRead
                    }
                    out.flush()
                }
            } else {
                send404(out, socket)
            }
        } catch (ignored: Exception) {
            // Socket closed by client during scrubbing or seek
        } finally {
            try {
                socket.close()
            } catch (ignored: Exception) {}
        }
    }

    private fun send404(out: java.io.OutputStream, socket: Socket) {
        try {
            val notFound = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n"
            out.write(notFound.toByteArray(StandardCharsets.UTF_8))
            out.flush()
            socket.close()
        } catch (ignored: Exception) {}
    }
}
