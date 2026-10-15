import React from 'react';
import { motion } from 'framer-motion';
import { MediaItem } from '../../types';
import { DotPlayIcon } from '../common/DotIcons';
import { triggerHaptic } from '../../lib/haptics';

interface ContinueWatchingHeroProps {
  item: MediaItem;
  onPlay: (item: MediaItem) => void;
}

export const ContinueWatchingHero: React.FC<ContinueWatchingHeroProps> = ({ item, onPlay }) => {
  const currentSec = item.currentTime || 0;
  const durationSec = item.duration || 0;

  // It must only render when there is actual progress to resume
  if (currentSec <= 5 || durationSec <= 10 || currentSec >= durationSec * 0.95) {
    return null;
  }

  const progressPercent = Math.min(100, Math.round((currentSec / durationSec) * 100));
  const remainingSec = Math.max(0, durationSec - currentSec);

  const formatTimeLeft = (sec: number): string => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${Math.max(1, minutes)}m left`;
  };

  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={() => {
        triggerHaptic('medium');
        onPlay(item);
      }}
      className="relative w-full flex-shrink-0 rounded-3xl overflow-hidden bg-nothing-surface1 border border-nothing-border hover:border-zinc-500 transition-all cursor-pointer group shadow-xl p-4 md:p-5 mb-5 select-none"
    >
      <div className="absolute inset-0 bg-dot-grid bg-dots-sm opacity-15 pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Progress Ring with Play Button inside */}
          <div className="relative w-14 h-14 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
              <circle
                cx="28"
                cy="28"
                r={radius}
                className="stroke-zinc-800"
                strokeWidth="3.5"
                fill="transparent"
              />
              <circle
                cx="28"
                cy="28"
                r={radius}
                className="stroke-nothing-red shadow-[0_0_6px_#D71921]"
                strokeWidth="3.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Play Button Center */}
            <div className="absolute inset-2 rounded-full bg-white text-black flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
              <DotPlayIcon size={18} color="#000" />
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-nothing-red shadow-[0_0_4px_#D71921]" />
              <span className="font-mono text-[0.6875rem] text-nothing-textMuted tracking-wider uppercase font-semibold">
                RESUME • {formatTimeLeft(remainingSec)}
              </span>
            </div>
            <h2 className="font-sans font-bold text-nothing-text text-[0.9375rem] truncate group-hover:opacity-85">
              {item.title}
            </h2>
            <div className="flex items-center gap-2 font-mono text-[0.6875rem] text-nothing-textDim mt-0.5">
              <span>{progressPercent}% WATCHED</span>
              {item.folder && <span>• {item.folder}</span>}
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic('medium');
            onPlay(item);
          }}
          className="h-10 px-4 rounded-full border border-nothing-border bg-nothing-surface2 font-mono text-[0.75rem] text-nothing-text hover:border-nothing-borderHover transition-all flex-shrink-0"
        >
          PLAY
        </button>
      </div>
    </motion.div>
  );
};
