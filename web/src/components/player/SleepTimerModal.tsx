import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { DotMatrixText } from '../common/DotMatrixText';
import { triggerHaptic } from '../../lib/haptics';

export const SleepTimerModal: React.FC = () => {
  const { isSleepTimerOpen, setModal, sleepTimerEndTimestamp, setSleepTimer } = usePlayerStore();

  if (!isSleepTimerOpen) return null;

  const timerOptions = [15, 30, 45, 60, 90];

  const remainingMinutes = sleepTimerEndTimestamp
    ? Math.max(0, Math.round((sleepTimerEndTimestamp - Date.now()) / 60000))
    : null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={() => setModal('sleep', false)}
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
                SLEEP TIMER
              </DotMatrixText>
            </div>
            <button
              onClick={() => setModal('sleep', false)}
              className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>

          {remainingMinutes !== null && (
            <div className="p-3 mb-4 rounded-xl bg-nothing-surface2 border border-nothing-red/40 flex items-center justify-between">
              <span className="font-mono text-xs text-zinc-400">ACTIVE COUNTDOWN:</span>
              <span className="font-doto text-sm font-bold text-nothing-red">
                {remainingMinutes} MINS LEFT
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2 mb-4">
            {timerOptions.map((mins) => (
              <button
                key={mins}
                onClick={() => {
                  triggerHaptic('tick');
                  setSleepTimer(mins);
                  setModal('sleep', false);
                }}
                className="p-3 rounded-xl border border-zinc-800 bg-nothing-surface2 hover:border-zinc-500 flex items-center justify-between font-mono text-xs text-white"
              >
                <span>{mins} MINUTES</span>
                <span className="text-zinc-500">Auto pause</span>
              </button>
            ))}
          </div>

          {sleepTimerEndTimestamp && (
            <button
              onClick={() => {
                triggerHaptic('light');
                setSleepTimer(null);
                setModal('sleep', false);
              }}
              className="w-full py-2.5 rounded-xl border border-zinc-800 font-mono text-xs text-zinc-400 hover:text-white"
            >
              CANCEL TIMER
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
