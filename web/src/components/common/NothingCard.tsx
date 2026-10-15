import React from 'react';

interface NothingCardProps {
  children: React.ReactNode;
  variant?: 'surface1' | 'surface2' | 'surface3' | 'outline';
  dotGrid?: boolean;
  pill?: boolean;
  interactive?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  testId?: string;
}

export const NothingCard: React.FC<NothingCardProps> = ({
  children,
  variant = 'surface1',
  dotGrid = false,
  pill = false,
  interactive = false,
  selected = false,
  onClick,
  className = '',
  testId,
}) => {
  const bgClasses = {
    surface1: 'bg-nothing-surface1',
    surface2: 'bg-nothing-surface2',
    surface3: 'bg-nothing-surface3',
    outline: 'bg-transparent',
  }[variant];

  const borderClass = selected
    ? 'border-nothing-red ring-1 ring-nothing-red'
    : 'border-nothing-border';

  const hoverClass = interactive
    ? 'hover:border-zinc-500 hover:bg-[#161616] active:scale-[0.985] cursor-pointer transition-all duration-150'
    : '';

  const roundedClass = pill ? 'rounded-full' : 'rounded-2xl';

  return (
    <div
      data-testid={testId}
      onClick={onClick}
      className={`relative border ${borderClass} ${bgClasses} ${roundedClass} ${hoverClass} p-4 overflow-hidden ${className}`}
    >
      {dotGrid && (
        <div className="absolute inset-0 bg-dot-grid bg-dots-sm opacity-25 pointer-events-none" />
      )}
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
};
