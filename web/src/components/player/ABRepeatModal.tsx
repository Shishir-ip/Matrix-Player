import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { DotMatrixText } from '../common/DotMatrixText';
import { triggerHaptic } from '../../lib/haptics';

export const ABRepeatModal: React.FC = () => {
  const { isABRepeatOpen, setModal, currentTime, abRepeat, setABRepeat, setLoopMode } = usePlayerStore();

  if (!isABRepeatOpen) return null;

  const handleSetA = () => {
    triggerHaptic('tick');
    const end = abRepeat ? abRepeat.end : currentTime + 10;
    setABRepeat({ start: currentTime, end: Math.max(currentTime + 1, end) });
    setLoopMode('ab');
  };

  const handleSetB = () => {
    triggerHaptic('tick');
    const start = abRepeat ? abRepeat.start : Math.max(0, currentTime - 10);
    setABRepeat({ start, end: Math.max(start + 1, currentTime) });
    setLoopMode('ab');
  };

  const handleClear = () => {
    triggerHaptic('light');
    setABRepeat(null);
    setLoopMode('off');
    setModal('ab', false);
  };

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={() => setModal('ab', false)}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-nothing-surface1 border border-nothing-border rounded-nothing p-6 shadow-2xl relative"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-nothing-red shadow-[0_0_8px_#D71921]" />
              <DotMatrixText size="lg" weight="bold">
                A-B SEGMENT LOOP
              </DotMatrixText>
            </div>
            <button
              onClick={() => setModal('ab', false)}
              className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>

          <p className="font-mono text-xs text-zinc-400 mb-5">
            Loop a specific timestamp range continuously (great for tutorials, dance, language study).
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={handleSetA}
              className="p-4 rounded-xl border border-zinc-800 bg-nothing-surface2 hover:border-zinc-500 text-left"
            >
              <span className="font-mono text-[10px] text-zinc-500 block mb-1">POINT A (START)</span>
              <span className="font-doto text-lg font-bold text-white">
                {abRepeat ? formatSec(abRepeat.start) : '--:--'}
              </span>
              <span className="font-mono text-[10px] text-nothing-red block mt-2">
                SET TO CURRENT
              </span>
            </button>

            <button
              onClick={handleSetB}
              className="p-4 rounded-xl border border-zinc-800 bg-nothing-surface2 hover:border-zinc-500 text-left"
            >
              <span className="font-mono text-[10px] text-zinc-500 block mb-1">POINT B (END)</span>
              <span className="font-doto text-lg font-bold text-white">
                {abRepeat ? formatSec(abRepeat.end) : '--:--'}
              </span>
              <span className="font-mono text-[10px] text-nothing-red block mt-2">
                SET TO CURRENT
              </span>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="flex-1 py-2.5 rounded-xl border border-zinc-800 font-mono text-xs text-zinc-400 hover:text-white"
            >
              DISABLE LOOP
            </button>
            <button
              onClick={() => setModal('ab', false)}
              className="flex-1 py-2.5 rounded-xl bg-nothing-red text-white font-mono text-xs font-bold shadow-[0_0_8px_#D71921]"
            >
              DONE
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
