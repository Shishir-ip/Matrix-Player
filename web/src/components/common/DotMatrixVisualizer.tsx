import React, { useEffect, useRef } from 'react';
import { audioEffects } from '../../lib/audioEffects';

interface DotMatrixVisualizerProps {
  isPlaying?: boolean;
  barCount?: number;
  dotsPerBar?: number;
  className?: string;
}

export const DotMatrixVisualizer: React.FC<DotMatrixVisualizerProps> = ({
  isPlaying = false,
  barCount = 18,
  dotsPerBar = 10,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const data = audioEffects.getVisualizerData();
      const colWidth = width / barCount;
      const dotDiameter = Math.min(colWidth * 0.65, height / (dotsPerBar * 1.5));
      const dotSpacingY = height / dotsPerBar;

      for (let i = 0; i < barCount; i++) {
        const dataIdx = Math.floor((i / barCount) * (data.length * 0.7));
        const val = isPlaying ? (data[dataIdx] || 0) : 10 + Math.sin(Date.now() / 400 + i) * 6;
        const normalized = Math.min(1, Math.max(0, val / 255));
        const activeDots = Math.round(normalized * dotsPerBar);

        const cx = i * colWidth + colWidth / 2;

        for (let j = 0; j < dotsPerBar; j++) {
          // Dots stack from bottom (dotsPerBar - 1) up to 0
          const dotRowFromBottom = dotsPerBar - 1 - j;
          const cy = height - (dotRowFromBottom * dotSpacingY + dotSpacingY / 2);
          const isLit = dotRowFromBottom < activeDots;
          const isTopLitDot = dotRowFromBottom === activeDots - 1 && activeDots > 0;

          ctx.beginPath();
          ctx.arc(cx, cy, dotDiameter / 2, 0, Math.PI * 2);

          if (isLit) {
            if (isTopLitDot && dotRowFromBottom >= dotsPerBar * 0.7) {
              // Top peek red LED
              ctx.fillStyle = '#D71921';
              ctx.shadowColor = '#D71921';
              ctx.shadowBlur = 6;
            } else {
              ctx.fillStyle = '#FFFFFF';
              ctx.shadowColor = '#FFFFFF';
              ctx.shadowBlur = 3;
            }
          } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.shadowBlur = 0;
          }

          ctx.fill();
        }
      }

      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, barCount, dotsPerBar]);

  return (
    <canvas
      ref={canvasRef}
      width={barCount * 14}
      height={dotsPerBar * 9}
      className={`select-none ${className}`}
    />
  );
};
