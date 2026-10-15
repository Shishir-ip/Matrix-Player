import { useRef, useState, useCallback, useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { triggerHaptic } from '../lib/haptics';

export interface GestureFeedbackState {
  type: 'none' | 'seek-forward' | 'seek-backward' | 'speed-2x' | 'volume' | 'brightness' | 'zoom';
  value?: number;
  label?: string;
  x?: number;
  y?: number;
}

export function usePlayerGestures(containerRef: React.RefObject<HTMLDivElement | null>) {
  const {
    isPlaying,
    setIsPlaying,
    currentTime,
    duration,
    setCurrentTime,
    volume,
    setVolume,
    brightness,
    setBrightness,
    playbackRate,
    setPlaybackRate,
    zoomScale,
    setZoomScale,
    isLocked,
    isMiniPlayer,
    setIsMiniPlayer,
    setModal,
  } = usePlayerStore();

  const [feedback, setFeedback] = useState<GestureFeedbackState>({ type: 'none' });

  // Refs for tracking gestures
  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    zone: 'left' | 'center' | 'right';
    initialVolume: number;
    initialBrightness: number;
    initialCurrentTime: number;
    initialDistance: number;
  } | null>(null);

  const longPressTimerRef = useRef<number | null>(null);
  const previousSpeedRef = useRef<number>(1.0);
  const tapTimerRef = useRef<number | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const isLongPressActiveRef = useRef(false);

  const clearFeedback = useCallback(() => {
    setFeedback({ type: 'none' });
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (isLocked || isMiniPlayer) return;

      if (e.touches.length === 2) {
        // Pinch-to-zoom gesture
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        touchStartRef.current = {
          x: 0,
          y: 0,
          time: Date.now(),
          zone: 'center',
          initialVolume: volume,
          initialBrightness: brightness,
          initialCurrentTime: currentTime,
          initialDistance: dist,
        };
        return;
      }

      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const width = rect.width;
      const height = rect.height;

      // Dead zone check (ignore touches within 32px of borders to avoid conflicting with system nav)
      if (x < 32 || x > width - 32 || y < 40 || y > height - 48) {
        return;
      }

      const zone: 'left' | 'center' | 'right' =
        x < width * 0.35 ? 'left' : x > width * 0.65 ? 'right' : 'center';

      const am = typeof window !== 'undefined' ? (window as any).AndroidMedia : null;
      let startBrightness = brightness;
      if (am && typeof am.getBrightness === 'function') {
        try {
          const sysB = am.getBrightness();
          if (typeof sysB === 'number' && sysB > 0) {
            startBrightness = sysB;
          }
        } catch {}
      }

      touchStartRef.current = {
        x,
        y,
        time: Date.now(),
        zone,
        initialVolume: volume,
        initialBrightness: startBrightness,
        initialCurrentTime: currentTime,
        initialDistance: 0,
      };

      isDraggingRef.current = false;
      isLongPressActiveRef.current = false;

      // Long press detection for 2x speed
      longPressTimerRef.current = window.setTimeout(() => {
        if (!isDraggingRef.current && touchStartRef.current) {
          isLongPressActiveRef.current = true;
          previousSpeedRef.current = playbackRate;
          setPlaybackRate(2.0);
          triggerHaptic('medium');
          setFeedback({ type: 'speed-2x', label: '2.0x' });
        }
      }, 480);
    },
    [
      isLocked,
      volume,
      brightness,
      currentTime,
      playbackRate,
      setPlaybackRate,
      containerRef,
    ]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (isLocked || isMiniPlayer || !touchStartRef.current) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Pinch zoom
      if (e.touches.length === 2 && touchStartRef.current.initialDistance > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.sqrt(dx * dx + dy * dy);
        const scaleDelta = currentDist / touchStartRef.current.initialDistance;
        const newZoom = Math.min(3.0, Math.max(0.7, scaleDelta * zoomScale));
        setZoomScale(newZoom);
        setFeedback({
          type: 'zoom',
          label: `${Math.round(newZoom * 100)}%`,
          value: newZoom,
        });
        return;
      }

      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      const curX = touch.clientX - rect.left;
      const curY = touch.clientY - rect.top;
      const deltaX = curX - touchStartRef.current.x;
      const deltaY = curY - touchStartRef.current.y;

      // If moving significantly, cancel long press
      if (Math.abs(deltaX) > 12 || Math.abs(deltaY) > 12) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }

      // If in 2x long press mode, sliding adjusts speed
      if (isLongPressActiveRef.current) {
        const speedDelta = Math.round((curX - touchStartRef.current.x) / 60) * 0.25;
        const newSpeed = Math.min(4.0, Math.max(0.5, 2.0 + speedDelta));
        setPlaybackRate(newSpeed);
        setFeedback({ type: 'speed-2x', label: `${newSpeed.toFixed(2)}x` });
        return;
      }

      // Determine drag direction
      if (!isDraggingRef.current) {
        if (Math.abs(deltaX) > 20 || Math.abs(deltaY) > 20) {
          isDraggingRef.current = true;
        }
      }

      if (!isDraggingRef.current) return;

      // Vertical swipe on Left: Brightness
      // Vertical swipe on Right: Volume
      // Horizontal swipe: Scrub seek
      if (Math.abs(deltaY) > Math.abs(deltaX) * 1.3) {
        const sensitivity = 0.005;
        const change = -deltaY * sensitivity;

        if (touchStartRef.current.zone === 'left') {
          const newBrightness = Math.min(
            1.0,
            Math.max(0.02, touchStartRef.current.initialBrightness + change)
          );
          setBrightness(newBrightness);

          const am = typeof window !== 'undefined' ? (window as any).AndroidMedia : null;
          if (am && typeof am.setBrightness === 'function') {
            try {
              am.setBrightness(newBrightness);
            } catch {}
          }

          const pct = Math.round(newBrightness * 100);
          setFeedback({
            type: 'brightness',
            value: pct,
            label: `${pct}%`,
          });
        } else if (touchStartRef.current.zone === 'right') {
          const newVolume = Math.min(
            1.0,
            Math.max(0.0, touchStartRef.current.initialVolume + change)
          );
          setVolume(newVolume);
          setFeedback({
            type: 'volume',
            value: Math.round(newVolume * 100),
            label: `${Math.round(newVolume * 100)}%`,
          });
        }
      } else if (Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
        // Horizontal Scrubbing
        const scrubSensitivity = Math.max(30, duration / 100);
        const deltaSeconds = (deltaX / rect.width) * scrubSensitivity;
        const targetTime = Math.min(
          duration,
          Math.max(0, touchStartRef.current.initialCurrentTime + deltaSeconds)
        );
        setCurrentTime(targetTime);
        const sign = deltaSeconds >= 0 ? '+' : '';
        setFeedback({
          type: deltaSeconds >= 0 ? 'seek-forward' : 'seek-backward',
          label: `${sign}${Math.round(deltaSeconds)}s`,
          value: targetTime,
        });
      }
    },
    [
      isLocked,
      zoomScale,
      duration,
      setZoomScale,
      setPlaybackRate,
      setBrightness,
      setVolume,
      setCurrentTime,
      containerRef,
    ]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      // Revert speed from long press 2x
      if (isLongPressActiveRef.current) {
        setPlaybackRate(previousSpeedRef.current);
        isLongPressActiveRef.current = false;
        clearFeedback();
        return;
      }

      if (isDraggingRef.current) {
        // Check for vertical swipe up to open queue or swipe down to minimize
        if (touchStartRef.current) {
          const changedTouch = e.changedTouches[0];
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const dy = (changedTouch.clientY - rect.top) - touchStartRef.current.y;
            if (dy > 140 && Math.abs(dy) > Math.abs(changedTouch.clientX - rect.left - touchStartRef.current.x)) {
              // Swipe down -> minimize to mini player
              setIsMiniPlayer(true);
              triggerHaptic('medium');
            } else if (dy < -140 && Math.abs(dy) > Math.abs(changedTouch.clientX - rect.left - touchStartRef.current.x)) {
              // Swipe up -> open queue
              setModal('queue', true);
              triggerHaptic('light');
            }
          }
        }
        isDraggingRef.current = false;
        touchStartRef.current = null;
        setTimeout(clearFeedback, 600);
        return;
      }

      // Tap handling (Single tap vs Double tap)
      if (touchStartRef.current) {
        const now = Date.now();
        const { x, y, zone } = touchStartRef.current;

        if (lastTapRef.current && now - lastTapRef.current.time < 320) {
          // Double tap recognized!
          if (tapTimerRef.current) {
            clearTimeout(tapTimerRef.current);
            tapTimerRef.current = null;
          }

          if (zone === 'left') {
            // Seek backward 10s
            setCurrentTime(Math.max(0, currentTime - 10));
            triggerHaptic('double');
            setFeedback({ type: 'seek-backward', label: '-10s', x, y });
          } else if (zone === 'right') {
            // Seek forward 10s
            setCurrentTime(Math.min(duration, currentTime + 10));
            triggerHaptic('double');
            setFeedback({ type: 'seek-forward', label: '+10s', x, y });
          } else {
            // Center double tap: play/pause toggle
            setIsPlaying(!isPlaying);
            triggerHaptic('medium');
          }

          setTimeout(clearFeedback, 700);
          lastTapRef.current = null;
        } else {
          // Single tap - wait briefly to verify not a double tap
          lastTapRef.current = { time: now, x, y };
          tapTimerRef.current = window.setTimeout(() => {
            lastTapRef.current = null;
            // Single tap will be handled by UI controls toggle
          }, 320);
        }
      }

      touchStartRef.current = null;
    },
    [
      currentTime,
      duration,
      isPlaying,
      clearFeedback,
      setCurrentTime,
      setIsPlaying,
      setPlaybackRate,
      setIsMiniPlayer,
      setModal,
      containerRef,
    ]
  );

  return {
    feedback,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
