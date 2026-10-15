import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { DotMatrixText } from '../common/DotMatrixText';
import { DotClock } from '../common/DotClock';
import { DotSlider } from '../common/DotSlider';
import {
  DotPlayIcon,
  DotPauseIcon,
  DotForwardIcon,
  DotBackwardIcon,
  DotFullscreenIcon,
  DotSubtitlesIcon,
  DotEqualizerIcon,
  DotSettingsIcon,
} from '../common/DotIcons';
import { triggerHaptic } from '../../lib/haptics';

interface PlayerControlsProps {
  visible: boolean;
  onUserInteraction: () => void;
  onToggleControls?: () => void;
  videoElement: HTMLVideoElement | null;
  onToggleAudioOnly?: () => void;
  isAudioOnlyMode?: boolean;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  visible,
  onUserInteraction,
  onToggleControls,
  videoElement,
  onToggleAudioOnly,
  isAudioOnlyMode = false,
}) => {
  const [showCaptureToast, setShowCaptureToast] = useState(false);
  const [captureFlash, setCaptureFlash] = useState(false);
  const {
    currentMedia,
    isPlaying,
    setIsPlaying,
    currentTime,
    duration,
    setCurrentTime,
    playbackRate,
    setPlaybackRate,
    aspectMode,
    setAspectMode,
    isFullscreen,
    setIsFullscreen,
    isLocked,
    setIsLocked,
    isPiP,
    setIsPiP,
    isMiniPlayer,
    setIsMiniPlayer,
    sleepTimerEndTimestamp,
    playNext,
    playPrevious,
    loopMode,
    setLoopMode,
    setModal,
    closePlayer,
    stats,
  } = usePlayerStore();

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPreviewTime, setScrubPreviewTime] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(videoElement?.muted || false);

  // Sync mute state
  useEffect(() => {
    if (videoElement) {
      setIsMuted(videoElement.muted);
    }
  }, [videoElement]);

  const handleToggleMute = () => {
    triggerHaptic('light');
    if (videoElement) {
      videoElement.muted = !videoElement.muted;
      setIsMuted(videoElement.muted);
    }
  };

  // Time format helper (MM:SS or HH:MM:SS)
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Toggle Orientation / Fullscreen
  const handleToggleRotate = () => {
    triggerHaptic('medium');
    const androidMedia = (window as any).AndroidMedia;
    if (androidMedia && typeof androidMedia.toggleOrientation === 'function') {
      androidMedia.toggleOrientation();
    } else {
      handleToggleFullscreen();
    }
  };

  // Toggle Fullscreen (standard HTML5 or Android WebView)
  const handleToggleFullscreen = async () => {
    triggerHaptic('medium');
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
        setIsFullscreen(true);
        if (screen.orientation && (screen.orientation as any).lock) {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } else {
        await document.exitFullscreen?.();
        setIsFullscreen(false);
        if (screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
        }
      }
    } catch {
      setIsFullscreen(!isFullscreen);
    }
  };

  // Toggle PiP (falls back gracefully to in-app MiniPlayer)
  const handleTogglePiP = async () => {
    triggerHaptic('light');
    if (!videoElement) {
      setIsMiniPlayer(true);
      return;
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else if (document.pictureInPictureEnabled) {
        await videoElement.requestPictureInPicture();
        setIsPiP(true);
      } else {
        setIsMiniPlayer(true);
      }
    } catch {
      setIsMiniPlayer(true);
    }
  };

  // Screenshot capture feature
  const handleTakeScreenshot = () => {
    if (!videoElement) return;
    triggerHaptic('success');
    setCaptureFlash(true);
    setTimeout(() => setCaptureFlash(false), 200);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 1920;
      canvas.height = videoElement.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        let dataUrl: string | null = null;
        try {
          dataUrl = canvas.toDataURL('image/png');
        } catch (corsErr) {
          console.warn('Canvas tainted by CORS:', corsErr);
        }

        if (dataUrl) {
          const androidMedia = (window as any).AndroidMedia;
          if (androidMedia && typeof androidMedia.saveScreenshot === 'function') {
            const title = currentMedia?.title || `matrix-capture-${Math.floor(currentTime)}s`;
            androidMedia.saveScreenshot(dataUrl, title);
          } else {
            const link = document.createElement('a');
            link.download = `matrix-capture-${Math.floor(currentTime)}s.png`;
            link.href = dataUrl;
            link.click();
          }
          setShowCaptureToast(true);
          setTimeout(() => setShowCaptureToast(false), 2500);
        }
      }
    } catch (e) {
      console.warn('Screenshot capture failed:', e);
    }
  };

  // Cycle aspect modes
  const handleCycleAspect = () => {
    triggerHaptic('tick');
    const modes: typeof aspectMode[] = ['fit', 'fill', '16:9', '4:3', '21:9', 'stretch'];
    const nextIdx = (modes.indexOf(aspectMode) + 1) % modes.length;
    setAspectMode(modes[nextIdx]);
  };

  // Speed cycle
  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];
  const handleCycleSpeed = () => {
    triggerHaptic('tick');
    const currentIdx = speeds.indexOf(playbackRate);
    const nextIdx = (currentIdx + 1) % speeds.length;
    setPlaybackRate(speeds[nextIdx]);
  };

  // Keyboard shortcuts integration
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          triggerHaptic('light');
          break;
        case 'ArrowLeft':
        case 'j': {
          e.preventDefault();
          const target = Math.max(0, currentTime - 10);
          setCurrentTime(target);
          if (videoElement) videoElement.currentTime = target;
          triggerHaptic('tick');
          break;
        }
        case 'ArrowRight':
        case 'l': {
          e.preventDefault();
          const target = Math.min(duration, currentTime + 10);
          setCurrentTime(target);
          if (videoElement) videoElement.currentTime = target;
          triggerHaptic('tick');
          break;
        }
        case 'f':
          e.preventDefault();
          handleToggleFullscreen();
          break;
        case 'p':
          e.preventDefault();
          handleTogglePiP();
          break;
        case 'm':
          e.preventDefault();
          if (videoElement) videoElement.muted = !videoElement.muted;
          break;
        case '<':
          e.preventDefault();
          setPlaybackRate(Math.max(0.25, playbackRate - 0.25));
          break;
        case '>':
          e.preventDefault();
          setPlaybackRate(Math.min(4.0, playbackRate + 0.25));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, duration, playbackRate, isFullscreen, videoElement]);

  const sleepMinsLeft = sleepTimerEndTimestamp
    ? Math.max(0, Math.round((sleepTimerEndTimestamp - Date.now()) / 60000))
    : null;

  return (
    <AnimatePresence>
      {/* Locked overlay: Only display unlock button */}
      {visible && isLocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onToggleControls?.();
            }
          }}
          className="absolute inset-0 z-30 pointer-events-auto flex items-start justify-center pt-12 select-none"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('medium');
              setIsLocked(false);
              onUserInteraction();
            }}
            className="px-5 py-2.5 rounded-full bg-nothing-red text-white font-mono text-xs font-bold tracking-widest flex items-center gap-2 shadow-[0_0_16px_#D71921] active:scale-95 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
            <span>TAP TO UNLOCK</span>
          </button>
        </motion.div>
      )}

      {/* Main Controls when unlocked */}
      {visible && !isLocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            // Tapping on transparent backdrop/overlay outside buttons immediately disappears controls & overlay!
            if (e.target === e.currentTarget) {
              onToggleControls?.();
            } else {
              onUserInteraction();
            }
          }}
          className="absolute inset-0 z-20 flex flex-col justify-between bg-gradient-to-b from-black/85 via-transparent to-black/90 pointer-events-auto select-none"
          style={{
            paddingLeft: 'max(var(--safe-left), 0.75rem)',
            paddingRight: 'max(var(--safe-right), 0.75rem)',
            paddingTop: 'max(var(--safe-top), 0.75rem)',
            paddingBottom: 'max(var(--safe-bottom), 0.75rem)',
          }}
        >
          {/* Top Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-between w-full gap-2"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Back Button */}
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  closePlayer();
                }}
                className="w-11 h-11 rounded-full bg-zinc-900/80 border border-zinc-700/80 hover:border-white flex items-center justify-center text-white transition-all active:scale-95 flex-shrink-0"
                title="Back to Library"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
              </button>

              {/* Title & Format Badge */}
              <div className="flex flex-col min-w-0 flex-1 truncate">
                <span className="font-sans font-medium text-white text-[0.875rem] md:text-base truncate">
                  {currentMedia?.title || 'Unknown Media'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[0.625rem] text-zinc-400">
                    {currentMedia?.format?.toUpperCase() || 'STREAM'}
                  </span>
                  {stats?.resolution && stats.resolution !== '0x0' && (
                    <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[0.5625rem] font-mono text-zinc-300 border border-zinc-700">
                      {stats.resolution}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Top Right Controls */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <DotClock className="hidden sm:inline-flex text-xs mr-2 text-zinc-300" />

              {/* Screen Orientation / Rotate */}
              <button
                onClick={handleToggleRotate}
                className="w-11 h-11 rounded-full bg-zinc-900/80 border border-zinc-700 hover:border-white flex items-center justify-center text-white transition-all active:scale-95"
                title="Rotate Screen / Orientation"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              </button>

              {/* Lock Controls Button */}
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  setIsLocked(true);
                }}
                className="w-11 h-11 rounded-full bg-zinc-900/80 border border-zinc-700 hover:border-white flex items-center justify-center text-white transition-all active:scale-95"
                title="Lock Controls"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z" />
                </svg>
              </button>

              {/* Picture in Picture */}
              <button
                onClick={handleTogglePiP}
                className="w-11 h-11 rounded-full bg-zinc-900/80 border border-zinc-700 hover:border-white flex items-center justify-center text-white transition-all active:scale-95"
                title="Picture-in-Picture / Mini Player"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <rect x="13" y="11" width="7" height="7" rx="1" fill="currentColor" fillOpacity="0.4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Center Playback Controls (Play, Prev, Next, -10s, +10s) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-4 sm:gap-10 my-auto"
          >
            {/* Previous Media */}
            <button
              onClick={() => {
                triggerHaptic('light');
                playPrevious();
              }}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-zinc-900/80 border border-zinc-700/80 hover:border-white flex items-center justify-center text-white transition-all active:scale-90"
              title="Previous"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            {/* Skip -10s */}
            <button
              onClick={() => {
                triggerHaptic('light');
                const target = Math.max(0, currentTime - 10);
                setCurrentTime(target);
                if (videoElement) videoElement.currentTime = target;
              }}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-zinc-900/80 border border-zinc-700/80 hover:border-white flex items-center justify-center text-white transition-all active:scale-90"
              title="-10s"
            >
              <DotBackwardIcon size={20} />
            </button>

            {/* Main Play / Pause Button with Red LED Halo */}
            <button
              onClick={() => {
                triggerHaptic('medium');
                setIsPlaying(!isPlaying);
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center justify-center shadow-[0_0_24px_rgba(255,255,255,0.25)] transition-all active:scale-95 flex-shrink-0"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <DotPauseIcon size={32} color="#000000" /> : <DotPlayIcon size={32} color="#000000" />}
            </button>

            {/* Skip +10s */}
            <button
              onClick={() => {
                triggerHaptic('light');
                const target = Math.min(duration, currentTime + 10);
                setCurrentTime(target);
                if (videoElement) videoElement.currentTime = target;
              }}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-zinc-900/80 border border-zinc-700/80 hover:border-white flex items-center justify-center text-white transition-all active:scale-90"
              title="+10s"
            >
              <DotForwardIcon size={20} />
            </button>

            {/* Next Media */}
            <button
              onClick={() => {
                triggerHaptic('light');
                playNext();
              }}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-zinc-900/80 border border-zinc-700/80 hover:border-white flex items-center justify-center text-white transition-all active:scale-90"
              title="Next"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>

          {/* Bottom Bar: Seek slider & Horizontally Scrollable Action Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full flex flex-col gap-2"
          >
            {/* Seek bar with Dot Slider */}
            <div className="flex items-center gap-2.5">
              <span className="font-doto text-xs font-semibold text-zinc-300 w-12 text-right">
                {formatTime(isScrubbing && scrubPreviewTime !== null ? scrubPreviewTime : currentTime)}
              </span>
              <div className="flex-1">
                <DotSlider
                  value={currentTime}
                  max={duration || 100}
                  buffered={stats?.bufferLength ? currentTime + stats.bufferLength : 0}
                  onChange={(val) => {
                    setScrubPreviewTime(val);
                  }}
                  onScrubStart={() => setIsScrubbing(true)}
                  onScrubEnd={(val) => {
                    setIsScrubbing(false);
                    setScrubPreviewTime(null);
                    setCurrentTime(val);
                    if (videoElement) videoElement.currentTime = val;
                  }}
                  formatTooltip={formatTime}
                  color="red"
                  showDotsTrack
                />
              </div>
              <span className="font-doto text-xs text-zinc-500 w-12 text-left">
                {formatTime(duration)}
              </span>
            </div>

            {/* Bottom Controls Action Carousel: smoothly scroll sideways on phone */}
            <div
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className="w-full flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5"
            >
              {/* 1. Playback Speed */}
              <button
                onClick={handleCycleSpeed}
                className="min-w-[3.25rem] h-11 px-3 rounded-full bg-zinc-900/90 border border-zinc-700 hover:border-white text-xs font-mono font-bold text-white transition-all active:scale-95 flex items-center justify-center flex-shrink-0"
                title="Playback Speed"
              >
                {playbackRate.toFixed(1)}X
              </button>

              {/* 2. Aspect Ratio */}
              <button
                onClick={handleCycleAspect}
                className="min-w-[3.25rem] h-11 px-3 rounded-full bg-zinc-900/90 border border-zinc-700 hover:border-white text-xs font-mono font-bold text-white transition-all active:scale-95 uppercase flex items-center justify-center flex-shrink-0"
                title="Aspect Ratio"
              >
                {aspectMode}
              </button>

              {/* 3. Rotate Screen */}
              <button
                onClick={handleToggleRotate}
                className="min-w-[3rem] h-11 px-3 rounded-full bg-zinc-900/90 border border-zinc-700 hover:border-white text-xs font-mono font-bold text-white transition-all active:scale-95 flex items-center gap-1.5 flex-shrink-0"
                title="Rotate / Fullscreen"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>ROTATE</span>
              </button>

              {/* 4. Mute / Unmute */}
              <button
                onClick={handleToggleMute}
                className={`min-w-[3rem] h-11 px-3 rounded-full border text-xs font-mono font-bold transition-all active:scale-95 flex items-center gap-1.5 flex-shrink-0 ${
                  isMuted ? 'bg-nothing-red/80 border-nothing-red text-white' : 'bg-zinc-900/90 border-zinc-700 text-white hover:border-white'
                }`}
                title="Mute / Unmute"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  {isMuted ? (
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27l4.73 4.73H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  ) : (
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  )}
                </svg>
                <span>{isMuted ? 'UNMUTE' : 'MUTE'}</span>
              </button>

              {/* 5. Equalizer */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setModal('equalizer', true);
                }}
                className="h-11 px-3 rounded-full bg-zinc-900/90 border border-zinc-700 hover:border-white text-xs font-mono font-bold text-white transition-all active:scale-95 flex items-center gap-1.5 flex-shrink-0"
                title="Audio Equalizer & Boost"
              >
                <DotEqualizerIcon size={16} />
                <span>EQ</span>
              </button>

              {/* 6. Subtitles & Audio */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setModal('subtitles', true);
                }}
                className="h-11 px-3 rounded-full bg-zinc-900/90 border border-zinc-700 hover:border-white text-xs font-mono font-bold text-white transition-all active:scale-95 flex items-center gap-1.5 flex-shrink-0"
                title="Subtitles & Audio Tracks"
              >
                <DotSubtitlesIcon size={16} />
                <span>CC</span>
              </button>

              {/* 7. Sleep Timer */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setModal('sleep', true);
                }}
                className={`h-11 px-3 rounded-full border text-xs font-mono font-bold transition-all active:scale-95 flex items-center gap-1.5 flex-shrink-0 ${
                  sleepMinsLeft !== null
                    ? 'bg-nothing-red/80 border-nothing-red text-white'
                    : 'bg-zinc-900/90 border-zinc-700 text-white hover:border-white'
                }`}
                title="Sleep Timer"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{sleepMinsLeft !== null ? `${sleepMinsLeft}M` : 'TIMER'}</span>
              </button>

              {/* 8. A-B Repeat Loop */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setModal('ab', true);
                }}
                className={`h-11 px-3 rounded-full border text-xs font-mono font-bold transition-all active:scale-95 flex items-center gap-1 flex-shrink-0 ${
                  loopMode === 'ab'
                    ? 'bg-nothing-red/80 border-nothing-red text-white'
                    : 'bg-zinc-900/90 border-zinc-700 text-white hover:border-white'
                }`}
                title="A-B Repeat Segment"
              >
                <span>A-B</span>
              </button>

              {/* 9. Loop Mode Toggle */}
              <button
                onClick={() => {
                  triggerHaptic('tick');
                  const modes: typeof loopMode[] = ['off', 'one', 'all', 'ab'];
                  const nextIdx = (modes.indexOf(loopMode) + 1) % modes.length;
                  setLoopMode(modes[nextIdx]);
                  if (modes[nextIdx] === 'ab') setModal('ab', true);
                }}
                className={`h-11 px-3 rounded-full border text-xs font-mono font-bold transition-all active:scale-95 uppercase flex items-center gap-1 flex-shrink-0 ${
                  loopMode !== 'off'
                    ? 'bg-zinc-800 border-nothing-red text-nothing-red'
                    : 'bg-zinc-900/90 border-zinc-700 text-white hover:border-white'
                }`}
                title="Loop Mode"
              >
                <span>LOOP: {loopMode}</span>
              </button>

              {/* 10. Frame Screenshot */}
              <button
                onClick={handleTakeScreenshot}
                className="h-11 px-3.5 rounded-full bg-zinc-900/90 border border-zinc-700 hover:border-white text-xs font-mono font-bold text-white transition-all active:scale-95 flex items-center gap-1.5 flex-shrink-0"
                title="Capture Screenshot Frame"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>CAPTURE</span>
              </button>

              {/* 11. Audio Mode (Background & Lock Screen Playback) */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onToggleAudioOnly?.();
                }}
                className={`h-11 px-3.5 rounded-full border text-xs font-mono font-bold transition-all active:scale-95 flex items-center gap-1.5 flex-shrink-0 ${
                  isAudioOnlyMode
                    ? 'bg-nothing-red border-nothing-red text-white shadow-[0_0_12px_#D71921]'
                    : 'bg-zinc-900/90 border-zinc-700 text-white hover:border-white'
                }`}
                title="Audio Mode (Background & Lock Screen Playback with Notification Progressbar)"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3v9.28a4.39 4.39 0 0 0-1.5-.28 4.5 4.5 0 1 0 4.5 4.5V6h4V3h-7z" />
                </svg>
                <span>AUDIO</span>
              </button>

              {/* 12. Quality Selector */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setModal('quality', true);
                }}
                className="h-11 px-3 rounded-full bg-zinc-900/90 border border-zinc-700 hover:border-white text-xs font-mono font-bold text-white transition-all active:scale-95 flex items-center gap-1 flex-shrink-0"
                title="Stream Quality"
              >
                <span>QUALITY</span>
              </button>

              {/* 13. Queue / Playlist */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setModal('queue', true);
                }}
                className="h-11 px-3 rounded-full bg-zinc-900/90 border border-zinc-700 hover:border-white text-xs font-mono font-bold text-white transition-all active:scale-95 flex items-center gap-1.5 flex-shrink-0"
                title="Playlist / Queue"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z" />
                </svg>
                <span>QUEUE</span>
              </button>

              {/* 14. Info / Diagnostics */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setModal('stats', true);
                }}
                className="h-11 px-3 rounded-full bg-zinc-900/90 border border-zinc-700 hover:border-white text-xs font-mono font-bold text-white transition-all active:scale-95 flex items-center gap-1 flex-shrink-0"
                title="Diagnostics & Stats"
              >
                <span>INFO</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Camera Capture Flash Animation */}
      {captureFlash && (
        <div className="fixed inset-0 z-50 bg-white pointer-events-none transition-opacity duration-200" />
      )}

      {/* Frame Captured Toast */}
      {showCaptureToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-zinc-950/95 border border-white text-white font-mono text-xs font-bold tracking-wider shadow-2xl flex items-center gap-2 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>FRAME CAPTURED & SAVED TO GALLERY</span>
        </div>
      )}
    </AnimatePresence>
  );
};
