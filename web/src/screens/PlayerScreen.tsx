import React, { useRef, useState, useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { usePlayerGestures } from '../hooks/usePlayerGestures';
import { VideoSurface } from '../components/player/VideoSurface';
import { PlayerControls } from '../components/player/PlayerControls';
import { GestureOverlay } from '../components/player/GestureOverlay';
import { AudioEqualizerModal } from '../components/player/AudioEqualizerModal';
import { SubtitleTrackModal } from '../components/player/SubtitleTrackModal';
import { QualitySelectorModal } from '../components/player/QualitySelectorModal';
import { StatsForNerdsModal } from '../components/player/StatsForNerdsModal';
import { ABRepeatModal } from '../components/player/ABRepeatModal';
import { SleepTimerModal } from '../components/player/SleepTimerModal';
import { QueueDrawerModal } from '../components/player/QueueDrawerModal';
import { DotMatrixVisualizer } from '../components/common/DotMatrixVisualizer';
import { DotMatrixText } from '../components/common/DotMatrixText';
import { DotPlayIcon, DotPauseIcon } from '../components/common/DotIcons';
import { EngineManager } from '../engines/EngineManager';
import { triggerHaptic } from '../lib/haptics';

export const PlayerScreen: React.FC = () => {
  const {
    currentMedia,
    isMiniPlayer,
    setIsMiniPlayer,
    isPlaying,
    setIsPlaying,
    closePlayer,
    isLocked,
    duration,
    currentTime,
  } = usePlayerStore();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [engineManager, setEngineManager] = useState<EngineManager | null>(null);

  // Auto-hide controls logic: 3 seconds for both play and pause
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<number | null>(null);
  const [isAudioOnlyMode, setIsAudioOnlyMode] = useState(false);

  // Mini-player draggable position and resizable width
  const [miniPos, setMiniPos] = useState(() => ({
    x: typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 336) : 16,
    y: typeof window !== 'undefined' ? Math.max(16, window.innerHeight - 260) : 100,
  }));
  const [miniWidth, setMiniWidth] = useState(320);
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; initWidth: number } | null>(null);

  const { feedback, handleTouchStart, handleTouchMove, handleTouchEnd } =
    usePlayerGestures(containerRef);

  // Auto-hide buttons & transparent black overlay after 3 seconds of inactivity
  const resetHideTimer = () => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  };

  // Reset 3s auto-hide timer whenever playing state changes (both play and pause!)
  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isPlaying]);

  // Audio Mode management: sync with Android MediaSession & WakeLock
  const handleToggleAudioOnly = () => {
    const nextMode = !isAudioOnlyMode;
    setIsAudioOnlyMode(nextMode);
    triggerHaptic('medium');

    const androidMedia = (window as any).AndroidMedia;
    if (androidMedia) {
      if (nextMode) {
        if (typeof androidMedia.startAudioMode === 'function') {
          androidMedia.startAudioMode(
            currentMedia?.title || 'Matrix Audio',
            currentMedia?.folder || 'Matrix Player',
            duration || 0,
            currentTime || 0,
            isPlaying
          );
        }
      } else {
        if (typeof androidMedia.stopAudioMode === 'function') {
          androidMedia.stopAudioMode();
        }
      }
    }
  };

  // Dragging logic for YouTube mini player
  const handlePointerDownDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {}
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: miniPos.x,
      initY: miniPos.y,
    };
  };

  const handlePointerMoveDrag = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const cardHeight = Math.round((miniWidth * 9) / 16) + 48;
    const maxX = Math.max(0, window.innerWidth - miniWidth - 8);
    const maxY = Math.max(0, window.innerHeight - cardHeight - 8);
    setMiniPos({
      x: Math.min(maxX, Math.max(8, dragRef.current.initX + dx)),
      y: Math.min(maxY, Math.max(8, dragRef.current.initY + dy)),
    });
  };

  const handlePointerUpDrag = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
    dragRef.current = null;
  };

  // Corner resizing logic for YouTube mini player
  const handlePointerDownResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {}
    resizeRef.current = {
      startX: e.clientX,
      initWidth: miniWidth,
    };
  };

  const handlePointerMoveResize = (e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    const dx = e.clientX - resizeRef.current.startX;
    const maxWidth = Math.min(window.innerWidth - 16, 520);
    const newWidth = Math.min(maxWidth, Math.max(200, resizeRef.current.initWidth + dx));
    setMiniWidth(newWidth);
  };

  const handlePointerUpResize = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
    resizeRef.current = null;
  };

  // Quick cycle sizes: 240px, 320px, 420px
  const handleCycleMiniSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('tick');
    const availableSizes = [240, 320, 420].filter((s) => s <= window.innerWidth - 16);
    const currentIdx = availableSizes.indexOf(miniWidth);
    const nextIdx = (currentIdx + 1) % availableSizes.length;
    setMiniWidth(availableSizes[nextIdx] || 320);
  };

  // Trigger Android Picture-in-Picture directly
  const handleTriggerAndroidPip = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');
    const androidMedia = (window as any).AndroidMedia;
    if (androidMedia && typeof androidMedia.enterPip === 'function') {
      androidMedia.enterPip();
    }
  };

  if (!currentMedia) {
    return null;
  }

  // 1. YouTube-style Floating Mini Video Player
  if (isMiniPlayer) {
    const videoHeight = Math.round((miniWidth * 9) / 16);

    return (
      <div
        style={{
          left: `${miniPos.x}px`,
          top: `${miniPos.y}px`,
          width: `${miniWidth}px`,
        }}
        onPointerMove={(e) => {
          handlePointerMoveDrag(e);
          handlePointerMoveResize(e);
        }}
        onPointerUp={(e) => {
          handlePointerUpDrag(e);
          handlePointerUpResize(e);
        }}
        className="fixed z-50 rounded-2xl overflow-hidden shadow-[0_12px_44px_rgba(0,0,0,0.9)] border border-zinc-700/80 bg-zinc-950 flex flex-col select-none touch-none transition-shadow hover:border-zinc-500"
      >
        {/* Drag Handle Top Bar */}
        <div
          onPointerDown={handlePointerDownDrag}
          className="w-full h-8 bg-zinc-900/95 border-b border-zinc-800 px-2 flex items-center justify-between cursor-move text-zinc-400 select-none"
        >
          {/* Grip dots & Title */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-500 flex-shrink-0">
              <circle cx="8" cy="6" r="2" />
              <circle cx="16" cy="6" r="2" />
              <circle cx="8" cy="12" r="2" />
              <circle cx="16" cy="12" r="2" />
              <circle cx="8" cy="18" r="2" />
              <circle cx="16" cy="18" r="2" />
            </svg>
            <span className="font-sans text-[11px] font-semibold text-white truncate">
              {currentMedia.title}
            </span>
          </div>

          {/* Quick Actions (Size toggle, Android PiP, Fullscreen expand, Close) */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Size cycle button */}
            <button
              onClick={handleCycleMiniSize}
              className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[9px] font-mono font-bold text-zinc-300"
              title="Cycle Mini Player Size"
            >
              {miniWidth < 280 ? 'S' : miniWidth < 380 ? 'M' : 'L'}
            </button>

            {/* Android System PiP button */}
            <button
              onClick={handleTriggerAndroidPip}
              className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95"
              title="Enter Android Picture-in-Picture"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <rect x="13" y="11" width="7" height="7" rx="1" fill="currentColor" fillOpacity="0.5" />
              </svg>
            </button>

            {/* Expand to Full Player button */}
            <button
              onClick={() => {
                triggerHaptic('medium');
                setIsMiniPlayer(false);
              }}
              className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95"
              title="Expand to Fullscreen"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-14v3h3v2h-5V5h2z" />
              </svg>
            </button>

            {/* Close button */}
            <button
              onClick={() => {
                triggerHaptic('light');
                closePlayer();
              }}
              className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-zinc-800 active:scale-95 text-xs font-bold"
              title="Close Player"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Live Active Video Surface */}
        <div
          onClick={() => {
            triggerHaptic('medium');
            setIsMiniPlayer(false);
          }}
          style={{ height: `${videoHeight}px` }}
          className="relative w-full bg-black cursor-pointer group overflow-hidden"
        >
          <VideoSurface
            onEngineReady={setEngineManager}
            videoRefOut={setVideoElement}
          />

          {/* Quick Play/Pause overlay on hover/touch */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
              setIsPlaying(!isPlaying);
            }}
            className="absolute bottom-2 right-2 z-30 w-8 h-8 rounded-full bg-black/80 border border-zinc-700/80 text-white flex items-center justify-center shadow-lg active:scale-90"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <DotPauseIcon size={16} color="#fff" /> : <DotPlayIcon size={16} color="#fff" />}
          </div>
        </div>

        {/* Resize Handle at Bottom-Right Corner */}
        <div
          onPointerDown={handlePointerDownResize}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-40 flex items-end justify-end p-0.5 text-zinc-500 hover:text-white"
          title="Drag to resize mini player"
        >
          <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
            <path d="M9 1L1 9h8V1z" />
          </svg>
        </div>
      </div>
    );
  }

  // 2. Full Player Screen
  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseMove={resetHideTimer}
      onClick={() => {
        // Tapping anywhere in the video screen toggles controls visibility
        if (controlsVisible) {
          setControlsVisible(false);
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        } else {
          resetHideTimer();
        }
      }}
      className="fixed inset-0 z-40 bg-black flex items-center justify-center select-none overflow-hidden"
    >
      {/* Video Surface Container */}
      <VideoSurface
        onEngineReady={setEngineManager}
        videoRefOut={setVideoElement}
      />

      {/* Audio-only Mode Visualizer Overlay */}
      {isAudioOnlyMode && (
        <div className="absolute inset-0 z-15 bg-black/95 flex flex-col items-center justify-center p-6 select-none">
          <div className="flex flex-col items-center gap-6">
            <span className="w-3 h-3 rounded-full bg-nothing-red shadow-[0_0_12px_#D71921] animate-ping" />
            <DotMatrixText size="3xl" color="white" glow>
              AUDIO MODE
            </DotMatrixText>
            <span className="font-mono text-sm text-zinc-400 max-w-md text-center truncate">
              {currentMedia.title}
            </span>
            <span className="font-mono text-xs text-zinc-500">
              Notification seekbar, lock screen & dynamic bar active
            </span>
            <div className="py-6">
              <DotMatrixVisualizer isPlaying={isPlaying} barCount={24} dotsPerBar={14} />
            </div>
          </div>
        </div>
      )}

      {/* Touch Gesture Feedback Overlay */}
      <GestureOverlay feedback={feedback} />

      {/* Player Top & Bottom Controls Bar */}
      <PlayerControls
        visible={controlsVisible}
        onUserInteraction={resetHideTimer}
        onToggleControls={() => {
          if (controlsVisible) {
            setControlsVisible(false);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          } else {
            resetHideTimer();
          }
        }}
        videoElement={videoElement}
        isAudioOnlyMode={isAudioOnlyMode}
        onToggleAudioOnly={handleToggleAudioOnly}
      />

      {/* Modal Dialogs */}
      <AudioEqualizerModal />
      <SubtitleTrackModal />
      <QualitySelectorModal onSelectQuality={(id) => engineManager?.setQuality(id)} />
      <StatsForNerdsModal />
      <ABRepeatModal />
      <SleepTimerModal />
      <QueueDrawerModal />
    </div>
  );
};
