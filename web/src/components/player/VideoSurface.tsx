import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { EngineManager } from '../../engines/EngineManager';
import { audioEffects } from '../../lib/audioEffects';
import { savePlaybackProgress } from '../../lib/db';
import { getActiveCue } from '../../lib/subtitleParser';
import { detectEngineFromUrl } from '../../lib/streamDetector';
import { DotMatrixSpinner } from '../common/DotMatrixSpinner';

interface VideoSurfaceProps {
  onEngineReady?: (engine: EngineManager) => void;
  videoRefOut?: (video: HTMLVideoElement | null) => void;
}

export const VideoSurface: React.FC<VideoSurfaceProps> = ({ onEngineReady, videoRefOut }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const engineManagerRef = useRef<EngineManager | null>(null);

  const {
    currentMedia,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    volume,
    volumeBoost,
    playbackRate,
    brightness,
    aspectMode,
    zoomScale,
    subtitles,
    activeSubtitleId,
    subtitleOffsetMs,
    loopMode,
    abRepeat,
    sleepTimerEndTimestamp,
    setSleepTimer,
    playNext,
    playPrevious,
    setQualities,
    setAudioTracks,
    setStats,
    isBuffering,
    setIsBuffering,
    errorMessage,
    setErrorMessage,
  } = usePlayerStore();

  const { subtitleSize, subtitleColor, corsProxyUrl } = useSettingsStore();
  const [activeCueText, setActiveCueText] = useState<string | null>(null);

  // Initialize Engine Manager
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    videoRefOut?.(video);

    const engine = new EngineManager({
      onQualityLevelsChanged: (qualities) => setQualities(qualities),
      onAudioTracksChanged: (tracks) => setAudioTracks(tracks),
      onError: (msg) => {
        setErrorMessage(msg);
        setIsBuffering(false);
      },
      onStatsUpdate: (stats) => setStats(stats),
    });

    engine.attach(video);
    engineManagerRef.current = engine;
    onEngineReady?.(engine);

    // Initialize Web Audio graph
    audioEffects.init(video);

    return () => {
      engine.destroy();
      engineManagerRef.current = null;
    };
  }, [setQualities, setAudioTracks, setStats, setErrorMessage, setIsBuffering, onEngineReady, videoRefOut]);

  // Load Source when currentMedia changes
  useEffect(() => {
    if (!currentMedia || !videoRef.current || !engineManagerRef.current) return;

    setIsBuffering(true);
    setErrorMessage(null);

    let sourceUrl = currentMedia.url;
    const androidMedia = (window as any).AndroidMedia;
    if (sourceUrl.includes('/local-media/') && androidMedia && typeof androidMedia.getLocalServerPort === 'function') {
      const port = androidMedia.getLocalServerPort();
      if (port > 0) {
        const id = sourceUrl.substring(sourceUrl.lastIndexOf('/') + 1).split('?')[0];
        sourceUrl = `http://127.0.0.1:${port}/local-media/${id}`;
      }
    }

    const detected = detectEngineFromUrl(sourceUrl);
    const engineType = currentMedia.format === 'm3u8' ? 'hls' :
      currentMedia.format === 'mpd' ? 'dash' :
      currentMedia.format === 'ts' || currentMedia.format === 'flv' ? 'mpegts' :
      detected.engine;

    engineManagerRef.current.loadSource(sourceUrl, engineType);

    // Global Android MediaSession action bridge
    (window as any).onMediaSessionAction = (action: string, param?: any) => {
      switch (action) {
        case 'play':
          setIsPlaying(true);
          break;
        case 'pause':
          setIsPlaying(false);
          break;
        case 'next':
          playNext();
          break;
        case 'previous':
          playPrevious();
          break;
        case 'seek':
          if (typeof param === 'number' && videoRef.current) {
            videoRef.current.currentTime = param;
            setCurrentTime(param);
          }
          break;
      }
    };

    // Media Session API integration
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentMedia.title || 'Matrix Video',
        artist: currentMedia.folder || 'Matrix Player',
        album: currentMedia.folder || 'Nothing Media',
        artwork: [
          {
            src: currentMedia.thumbnailUrl || './icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('seekforward', () => {
        if (videoRef.current) videoRef.current.currentTime += 10;
      });
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        if (videoRef.current) videoRef.current.currentTime -= 10;
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
    }
  }, [currentMedia, setIsBuffering, setErrorMessage, setIsPlaying, playNext, playPrevious, setCurrentTime]);

  // Sync play/pause with state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const am = (window as any).AndroidMedia;
    if (am) {
      if (typeof am.setPlayingState === 'function') am.setPlayingState(isPlaying);
      if (typeof am.updatePlaybackState === 'function') {
        am.updatePlaybackState(isPlaying, video.currentTime || 0);
      }
    }

    if (isPlaying) {
      audioEffects.resume();
      video.play().catch((err: any) => {
        if (err.name !== 'AbortError') {
          console.warn('Playback play request prevented:', err);
        }
      });
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Sync volume, boost, rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.playbackRate = playbackRate;
    }
    audioEffects.setVolumeBoost(volumeBoost);
  }, [volume, volumeBoost, playbackRate]);

  // Periodic video event handlers
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const ct = video.currentTime;
    setCurrentTime(ct);

    // Check A-B Repeat
    if (loopMode === 'ab' && abRepeat) {
      if (ct >= abRepeat.end) {
        video.currentTime = abRepeat.start;
      }
    }

    // Check Sleep Timer
    if (sleepTimerEndTimestamp && Date.now() >= sleepTimerEndTimestamp) {
      setIsPlaying(false);
      setSleepTimer(null);
    }

    // Save playback progress to DB and store periodically (every 3 seconds)
    if (currentMedia && Math.floor(ct) % 3 === 0) {
      savePlaybackProgress(
        currentMedia.id,
        currentMedia.title,
        ct,
        video.duration || 0,
        currentMedia.thumbnailUrl
      );
      useLibraryStore.getState().updateMediaProgress(currentMedia.id, ct, video.duration || 0);
    }

    // Subtitle rendering
    if (activeSubtitleId) {
      const track = subtitles.find((s) => s.id === activeSubtitleId);
      if (track && track.cues) {
        const text = getActiveCue(track.cues, ct, subtitleOffsetMs);
        setActiveCueText(text);
      } else {
        setActiveCueText(null);
      }
    } else {
      setActiveCueText(null);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      if (currentMedia?.currentTime && currentMedia.currentTime > 2) {
        try {
          videoRef.current.currentTime = currentMedia.currentTime;
        } catch (e) {
          console.warn('[Matrix Player] Resume seek deferred:', e);
        }
      }
      setIsBuffering(false);
    }
  };

  const handleEnded = () => {
    if (loopMode === 'one' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    } else if (loopMode === 'all') {
      playNext();
    } else {
      setIsPlaying(false);
    }
  };

  // Aspect ratio class mapping
  const getAspectClass = () => {
    switch (aspectMode) {
      case 'fill':
        return 'w-full h-full object-cover';
      case 'stretch':
        return 'w-full h-full object-fill';
      case '16:9':
        return 'aspect-video w-full h-auto object-contain';
      case '4:3':
        return 'aspect-[4/3] w-auto h-full object-contain';
      case '21:9':
        return 'aspect-[21/9] w-full h-auto object-contain';
      case 'original':
        return 'max-w-none max-h-none object-none';
      case 'fit':
      default:
        return 'w-full h-full object-contain';
    }
  };

  const subSizeClasses = {
    small: 'text-sm md:text-base',
    medium: 'text-base md:text-xl',
    large: 'text-xl md:text-3xl',
  }[subtitleSize];

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black select-none">
      <video
        ref={videoRef}
        playsInline
        webkit-playsinline="true"
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onLoadedData={() => setIsBuffering(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        onEnded={handleEnded}
        onError={() => {
          const video = videoRef.current;
          if (video && video.hasAttribute('crossOrigin')) {
            console.warn('[Matrix Player] Retrying video without crossOrigin...');
            video.removeAttribute('crossOrigin');
            video.load();
            video.play().catch(() => {});
          } else {
            const err = video?.error;
            const message = err
              ? `Playback notice: Code ${err.code} (${err.message || 'Format unsupported by hardware decoder'})`
              : 'Playback notice: Unable to decode stream';
            setErrorMessage(message);
            setIsBuffering(false);
          }
        }}
        className={getAspectClass()}
        style={{
          filter: (typeof window !== 'undefined' && !(window as any).AndroidMedia && brightness !== 1)
            ? `brightness(${brightness})`
            : undefined,
          transform: `scale(${zoomScale})`,
          transformOrigin: 'center center',
        }}
      />

      {/* Buffering Spinner */}
      {isBuffering && !errorMessage && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 bg-black/30 backdrop-blur-[2px]">
          <DotMatrixSpinner size="lg" label="BUFFERING" />
        </div>
      )}

      {/* Error Message Display */}
      {errorMessage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/90 z-25 text-center">
          <div className="w-12 h-12 rounded-full border border-nothing-red flex items-center justify-center mb-4">
            <span className="w-4 h-4 rounded-full bg-nothing-red shadow-[0_0_12px_#D71921]" />
          </div>
          <span className="font-doto text-xl font-bold text-white mb-2 tracking-wider">
            PLAYBACK ERROR
          </span>
          <p className="font-mono text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
            {errorMessage}
          </p>
          {corsProxyUrl ? (
            <span className="font-mono text-[11px] text-zinc-500">
              CORS proxy configured: {corsProxyUrl}
            </span>
          ) : (
            <p className="font-mono text-[11px] text-zinc-500 max-w-sm">
              If this is an external stream blocked by CORS headers, you can configure a CORS proxy in Settings.
            </p>
          )}
        </div>
      )}

      {/* Subtitles Overlay */}
      {activeCueText && (
        <div className="absolute bottom-20 left-6 right-6 flex justify-center pointer-events-none z-20">
          <div
            className={`px-4 py-2 rounded-xl bg-black/80 border border-zinc-800 text-center font-sans font-medium tracking-wide shadow-2xl backdrop-blur-sm max-w-3xl leading-snug ${subSizeClasses}`}
            style={{ color: subtitleColor }}
          >
            {activeCueText}
          </div>
        </div>
      )}
    </div>
  );
};
