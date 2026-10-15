import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { DotMatrixLogo } from '../components/common/DotMatrixLogo';

export const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  useEffect(() => {
    // Under 1.2s splash duration requirement
    const timer = setTimeout(() => {
      onFinish();
    }, 1150);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 select-none overflow-hidden"
    >
      {/* Background Dot Matrix Grid */}
      <div className="absolute inset-0 bg-dot-grid bg-dots-md opacity-25" />

      {/* Center Assembling Dot-Matrix Logo */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <DotMatrixLogo size="xl" animated />
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.3 }}
          className="font-mono text-xs text-zinc-500 tracking-widest uppercase"
        >
          NOTHING OS MEDIA ENGINE
        </motion.span>
      </div>
    </motion.div>
  );
};
