import React from 'react';

interface RedLedProps {
  active?: boolean;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const RedLed: React.FC<RedLedProps> = ({
  active = true,
  pulse = false,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
  }[size];

  if (!active) {
    return <span className={`inline-block rounded-full bg-zinc-800 border border-zinc-700 ${sizeClasses} ${className}`} />;
  }

  return (
    <span
      className={`relative inline-flex items-center justify-center ${sizeClasses} ${className}`}
    >
      <span
        className={`absolute inline-flex h-full w-full rounded-full bg-nothing-red ${
          pulse ? 'animate-ping opacity-75' : 'opacity-40'
        }`}
      />
      <span
        className={`relative inline-flex rounded-full bg-nothing-red shadow-[0_0_8px_#D71921] ${sizeClasses}`}
      />
    </span>
  );
};
