import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GestureFeedbackState } from '../../hooks/usePlayerGestures';
import { DotMatrixText } from '../common/DotMatrixText';

export const GestureOverlay: React.FC<{ feedback: GestureFeedbackState }> = ({ feedback }) => {
  if (feedback.type === 'none') return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        {/* Double-tap Seek Ripple with +10 / -10 */}
        {(feedback.type === 'seek-forward' || feedback.type === 'seek-backward') && (
          <motion.div
            key={feedback.type + feedback.label}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className={`flex flex-col items-center justify-center p-6 rounded-full bg-black/75 border border-zinc-700/80 backdrop-blur-md shadow-2xl ${
              feedback.type === 'seek-forward' ? 'translate-x-12' : '-translate-x-12'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-nothing-red shadow-[0_0_8px_#D71921]" />
              <DotMatrixText size="3xl" color="white" glow>
                {feedback.label}
              </DotMatrixText>
            </div>
            <span className="font-mono text-[11px] text-zinc-400 tracking-widest mt-1">
              {feedback.type === 'seek-forward' ? 'SKIP FORWARD' : 'SKIP BACK'}
            </span>
          </motion.div>
        )}

        {/* Long Press 2x Speed Glyph */}
        {feedback.type === 'speed-2x' && (
          <motion.div
            key="speed"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-black/85 border border-nothing-red shadow-[0_0_20px_rgba(215,25,33,0.3)] backdrop-blur-md"
          >
            <span className="w-3 h-3 rounded-full bg-nothing-red animate-ping" />
            <DotMatrixText size="2xl" color="red" glow>
              {feedback.label || '2.0X'}
            </DotMatrixText>
            <span className="font-mono text-xs text-white tracking-widest uppercase">
              TURBO SPEED
            </span>
          </motion.div>
        )}

        {/* Volume Vertical Dot-Bar Indicator on Right */}
        {feedback.type === 'volume' && (
          <motion.div
            key="volume"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 p-3 rounded-2xl bg-black/85 border border-zinc-800 backdrop-blur-md"
          >
            <span className="font-mono text-[10px] text-zinc-400 tracking-wider">VOL</span>
            {/* Dot bar column */}
            <div className="h-32 w-3 flex flex-col-reverse justify-between py-1">
              {Array.from({ length: 12 }, (_, i) => {
                const fillRatio = (feedback.value || 0) / 100;
                const isLit = i / 12 < fillRatio;
                return (
                  <span
                    key={i}
                    className={`w-2.5 h-1.5 rounded-sm transition-colors duration-75 ${
                      isLit
                        ? i > 9
                          ? 'bg-nothing-red shadow-[0_0_6px_#D71921]'
                          : 'bg-white'
                        : 'bg-zinc-800'
                    }`}
                  />
                );
              })}
            </div>
            <span className="font-doto text-xs font-bold text-white tracking-wider">
              {feedback.label}
            </span>
          </motion.div>
        )}

        {/* Brightness Vertical Dot-Bar Indicator on Left */}
        {feedback.type === 'brightness' && (
          <motion.div
            key="brightness"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 p-3 rounded-2xl bg-black/85 border border-zinc-800 backdrop-blur-md"
          >
            <span className="font-mono text-[10px] text-zinc-400 tracking-wider">BRIGHT</span>
            <div className="h-32 w-3 flex flex-col-reverse justify-between py-1">
              {Array.from({ length: 12 }, (_, i) => {
                const fillRatio = (feedback.value || 0) / 100;
                const isLit = i / 12 < fillRatio;
                return (
                  <span
                    key={i}
                    className={`w-2.5 h-1.5 rounded-sm transition-colors duration-75 ${
                      isLit ? 'bg-white' : 'bg-zinc-800'
                    }`}
                  />
                );
              })}
            </div>
            <span className="font-doto text-xs font-bold text-white tracking-wider">
              {feedback.label}
            </span>
          </motion.div>
        )}

        {/* Zoom Scale Indicator */}
        {feedback.type === 'zoom' && (
          <motion.div
            key="zoom"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="px-4 py-2 rounded-full bg-black/80 border border-zinc-700 backdrop-blur-md flex items-center gap-2"
          >
            <span className="font-mono text-xs text-zinc-400">ZOOM</span>
            <DotMatrixText size="lg" color="white">
              {feedback.label}
            </DotMatrixText>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
