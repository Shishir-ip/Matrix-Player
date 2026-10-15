import React from 'react';
import { motion } from 'framer-motion';

interface DotMatrixLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}

export const DotMatrixLogo: React.FC<DotMatrixLogoProps> = ({
  size = 'md',
  animated = false,
  className = '',
}) => {
  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl',
  }[size];

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  }[size];

  if (!animated) {
    return (
      <div className={`flex items-center gap-2 select-none ${className}`}>
        <span className={`font-doto font-black tracking-widest text-white ${textSizes}`}>
          MATRIX
        </span>
        <span className={`rounded-full bg-nothing-red shadow-[0_0_8px_#D71921] ${dotSizes}`} />
      </div>
    );
  }

  const letters = ['M', 'A', 'T', 'R', 'I', 'X'];

  return (
    <div className={`flex items-center gap-1.5 select-none ${className}`}>
      {letters.map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, scale: 0.2, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 24,
            delay: index * 0.08,
          }}
          className={`font-doto font-black tracking-widest text-white ${textSizes}`}
        >
          {char}
        </motion.span>
      ))}
      <motion.span
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.4, 1], opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.35, ease: 'easeOut' }}
        className={`rounded-full bg-nothing-red shadow-[0_0_12px_#D71921] ${dotSizes}`}
      />
    </div>
  );
};
