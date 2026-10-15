import React from 'react';

interface DotMatrixTextProps {
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  weight?: 'normal' | 'semibold' | 'bold' | 'black';
  color?: 'white' | 'red' | 'muted' | 'dim';
  className?: string;
  glow?: boolean;
}

export const DotMatrixText: React.FC<DotMatrixTextProps> = ({
  children,
  size = 'base',
  weight = 'bold',
  color = 'white',
  className = '',
  glow = false,
}) => {
  const sizeClasses = {
    xs: 'text-xs tracking-wider',
    sm: 'text-sm tracking-widest',
    base: 'text-base tracking-widest',
    lg: 'text-lg tracking-widest',
    xl: 'text-xl tracking-widest',
    '2xl': 'text-2xl tracking-widest',
    '3xl': 'text-3xl tracking-widest',
    '4xl': 'text-4xl tracking-widest',
  }[size];

  const weightClasses = {
    normal: 'font-normal',
    semibold: 'font-semibold',
    bold: 'font-bold',
    black: 'font-black',
  }[weight];

  const colorClasses = {
    white: 'text-nothing-text',
    red: 'text-nothing-red',
    muted: 'text-nothing-textMuted',
    dim: 'text-nothing-textDim',
  }[color];

  const glowStyle = glow
    ? color === 'red'
      ? { textShadow: '0 0 10px rgba(215, 25, 33, 0.7)' }
      : { textShadow: '0 0 8px rgba(255, 255, 255, 0.4)' }
    : undefined;

  return (
    <span
      style={glowStyle}
      className={`font-doto uppercase select-none ${sizeClasses} ${weightClasses} ${colorClasses} ${className}`}
    >
      {children}
    </span>
  );
};
