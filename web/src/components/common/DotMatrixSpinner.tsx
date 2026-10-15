import React from 'react';

interface DotMatrixSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const DotMatrixSpinner: React.FC<DotMatrixSpinnerProps> = ({
  size = 'md',
  label,
  className = '',
}) => {
  const pixelSizes = {
    sm: 36,
    md: 52,
    lg: 72,
  }[size];

  const dotCount = 12;
  const dots = Array.from({ length: dotCount }, (_, i) => i);

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className="relative animate-spin"
        style={{
          width: pixelSizes,
          height: pixelSizes,
          animationDuration: '1.2s',
          animationTimingFunction: 'steps(12)',
        }}
      >
        {dots.map((i) => {
          const angle = (i * 360) / dotCount;
          const radius = pixelSizes * 0.38;
          const rad = (angle * Math.PI) / 180;
          const x = pixelSizes / 2 + radius * Math.cos(rad);
          const y = pixelSizes / 2 + radius * Math.sin(rad);
          const opacity = (i + 1) / dotCount;
          const isLead = i === dotCount - 1;

          return (
            <div
              key={i}
              className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 ${
                isLead ? 'bg-nothing-red shadow-[0_0_8px_#D71921]' : 'bg-white'
              }`}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: size === 'sm' ? '3px' : size === 'md' ? '4.5px' : '6px',
                height: size === 'sm' ? '3px' : size === 'md' ? '4.5px' : '6px',
                opacity: isLead ? 1 : opacity * 0.85,
              }}
            />
          );
        })}
      </div>
      {label && (
        <span className="font-mono text-xs text-zinc-400 tracking-widest uppercase">
          {label}
        </span>
      )}
    </div>
  );
};
