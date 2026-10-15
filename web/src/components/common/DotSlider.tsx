import React, { useRef, useState, useCallback } from 'react';
import { triggerHaptic } from '../../lib/haptics';

interface DotSliderProps {
  value: number; // 0 to max
  max: number;
  buffered?: number; // 0 to max
  onChange: (value: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: (value: number) => void;
  formatTooltip?: (value: number) => string;
  color?: 'red' | 'white';
  showDotsTrack?: boolean;
  className?: string;
}

export const DotSlider: React.FC<DotSliderProps> = ({
  value,
  max,
  buffered = 0,
  onChange,
  onScrubStart,
  onScrubEnd,
  formatTooltip,
  color = 'red',
  showDotsTrack = false,
  className = '',
}) => {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateRatio = (clientX: number): number => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(rect.width, clientX - rect.left));
    return rect.width > 0 ? pos / rect.width : 0;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    onScrubStart?.();
    triggerHaptic('tick');

    const ratio = calculateRatio(e.clientX);
    const newVal = ratio * max;
    onChange(newVal);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const moveRatio = calculateRatio(moveEvent.clientX);
      const moveVal = moveRatio * max;
      onChange(moveVal);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      const finalRatio = calculateRatio(upEvent.clientX);
      const finalVal = finalRatio * max;
      onScrubEnd?.(finalVal);
      triggerHaptic('light');
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const bufferedPercent = max > 0 ? Math.min(100, Math.max(0, (buffered / max) * 100)) : 0;

  return (
    <div
      ref={barRef}
      onPointerDown={handlePointerDown}
      onPointerEnter={() => setIsHovering(true)}
      onPointerLeave={() => {
        setIsHovering(false);
        setHoverPosition(null);
      }}
      onPointerMove={(e) => {
        const ratio = calculateRatio(e.clientX);
        setHoverPosition(ratio * max);
      }}
      className={`group relative h-9 flex items-center cursor-pointer select-none touch-none ${className}`}
    >
      {/* Background Track */}
      <div className="relative w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden transition-all duration-150 group-hover:h-2">
        {/* Optional Dot matrix grid pattern on track */}
        {showDotsTrack && (
          <div className="absolute inset-0 bg-dot-grid bg-dots-sm opacity-20 pointer-events-none" />
        )}

        {/* Buffered Progress */}
        <div
          className="absolute left-0 top-0 bottom-0 bg-zinc-600/50 rounded-full transition-all duration-300"
          style={{ width: `${bufferedPercent}%` }}
        />

        {/* Active Progress */}
        <div
          className={`absolute left-0 top-0 bottom-0 rounded-full transition-all ${
            color === 'red' ? 'bg-nothing-red shadow-[0_0_8px_#D71921]' : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Thumb (Nothing Red LED Dot) */}
      <div
        className={`absolute -translate-x-1/2 w-4 h-4 rounded-full flex items-center justify-center pointer-events-none transition-transform duration-100 ${
          isDragging || isHovering ? 'scale-125' : 'scale-100'
        }`}
        style={{ left: `${percent}%` }}
      >
        <span
          className={`w-3.5 h-3.5 rounded-full border-2 border-black ${
            color === 'red'
              ? 'bg-nothing-red shadow-[0_0_10px_#D71921]'
              : 'bg-white shadow-[0_0_8px_white]'
          }`}
        />
      </div>

      {/* Hover Time Tooltip */}
      {isHovering && hoverPosition !== null && formatTooltip && (
        <div
          className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-white font-mono text-[11px] pointer-events-none shadow-lg tracking-wider"
          style={{
            left: `${max > 0 ? (hoverPosition / max) * 100 : 0}%`,
          }}
        >
          {formatTooltip(hoverPosition)}
        </div>
      )}
    </div>
  );
};
