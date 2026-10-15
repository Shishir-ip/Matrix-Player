import React from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { DotPlayIcon, DotPauseIcon } from '../common/DotIcons';
import { triggerHaptic } from '../../lib/haptics';

export const MiniPlayer: React.FC = () => {
  const { currentMedia, isPlaying, setIsPlaying, isMiniPlayer, setIsMiniPlayer, closePlayer } = usePlayerStore();

  if (!isMiniPlayer || !currentMedia) return null;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 80, opacity: 0 }}
      onClick={() => {
        triggerHaptic('medium');
        setIsMiniPlayer(false);
      }}
      className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-45 w-72 md:w-84 bg-nothing-surface1/95 border border-zinc-700/90 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl flex items-center gap-3 cursor-pointer hover:border-white transition-all group"
    >
      {/* Thumbnail */}
      <div className="relative w-16 h-12 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-zinc-800">
        {currentMedia.thumbnailUrl ? (
          <img src={currentMedia.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-zinc-900" />
        )}
        <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-nothing-red shadow-[0_0_4px_#D71921]" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <span className="font-sans text-xs font-semibold text-white truncate block">
          {currentMedia.title}
        </span>
        <span className="font-mono text-[10px] text-zinc-400">
          MINI PLAYER • TAP TO EXPAND
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => {
            triggerHaptic('light');
            setIsPlaying(!isPlaying);
          }}
          className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center"
        >
          {isPlaying ? <DotPauseIcon size={16} color="#000" /> : <DotPlayIcon size={16} color="#000" />}
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            closePlayer();
          }}
          className="w-7 h-7 rounded-full text-zinc-500 hover:text-white flex items-center justify-center text-xs"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
};
