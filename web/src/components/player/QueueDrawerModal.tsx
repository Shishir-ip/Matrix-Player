import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { DotMatrixText } from '../common/DotMatrixText';
import { triggerHaptic } from '../../lib/haptics';

export const QueueDrawerModal: React.FC = () => {
  const { isQueueOpen, setModal, queue, queueIndex, playMedia, removeFromQueue } = usePlayerStore();

  if (!isQueueOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm"
        onClick={() => setModal('queue', false)}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm sm:max-w-md h-full bg-nothing-surface1 border-l border-nothing-border p-6 shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-nothing-red shadow-[0_0_8px_#D71921]" />
              <DotMatrixText size="xl" weight="bold">
                PLAY QUEUE
              </DotMatrixText>
            </div>
            <button
              onClick={() => setModal('queue', false)}
              className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-sm"
            >
              ✕
            </button>
          </div>

          <span className="font-mono text-xs text-zinc-500 mb-4 block">
            {queue.length} ITEMS IN PLAYLIST
          </span>

          {/* Queue List */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
            {queue.map((item, idx) => {
              const isCurrent = idx === queueIndex;
              return (
                <div
                  key={item.id + idx}
                  onClick={() => {
                    triggerHaptic('tick');
                    playMedia(item);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                    isCurrent
                      ? 'border-nothing-red bg-zinc-900 shadow-md'
                      : 'border-zinc-800/80 bg-nothing-surface2 hover:border-zinc-600'
                  }`}
                >
                  {/* Thumbnail / Indicator */}
                  <div className="relative w-14 h-10 rounded-lg overflow-hidden bg-black flex-shrink-0 border border-zinc-800">
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-zinc-600" />
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute inset-0 bg-nothing-red/30 flex items-center justify-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-nothing-red animate-ping" />
                      </div>
                    )}
                  </div>

                  {/* Title & info */}
                  <div className="flex-1 min-w-0">
                    <span className="font-sans text-xs font-semibold text-white truncate block">
                      {item.title}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {item.format?.toUpperCase() || 'STREAM'}
                    </span>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      removeFromQueue(idx);
                    }}
                    className="w-7 h-7 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
