import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { DotMatrixText } from '../common/DotMatrixText';
import { triggerHaptic } from '../../lib/haptics';

export const QualitySelectorModal: React.FC<{ onSelectQuality?: (id: number) => void }> = ({
  onSelectQuality,
}) => {
  const { isQualityOpen, setModal, qualities, currentQualityId, setCurrentQualityId } = usePlayerStore();

  if (!isQualityOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={() => setModal('quality', false)}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-nothing-surface1 border border-nothing-border rounded-nothing p-6 shadow-2xl relative"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-nothing-red shadow-[0_0_8px_#D71921]" />
              <DotMatrixText size="lg" weight="bold">
                STREAM QUALITY
              </DotMatrixText>
            </div>
            <button
              onClick={() => setModal('quality', false)}
              className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {qualities.length === 0 ? (
              <span className="font-mono text-xs text-zinc-500 py-3 text-center">
                Single bitrate source / Automatic
              </span>
            ) : (
              qualities.map((q) => (
                <button
                  key={q.id}
                  onClick={() => {
                    triggerHaptic('tick');
                    setCurrentQualityId(q.id);
                    onSelectQuality?.(q.id);
                    setModal('quality', false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs font-mono transition-all ${
                    currentQualityId === q.id
                      ? 'border-nothing-red bg-zinc-900 text-white'
                      : 'border-zinc-800 bg-nothing-surface2 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="font-bold">{q.label}</span>
                  {q.bitrate && (
                    <span className="text-zinc-500 text-[10px]">
                      {Math.round(q.bitrate / 1000)} kbps
                    </span>
                  )}
                  {currentQualityId === q.id && (
                    <span className="w-2 h-2 rounded-full bg-nothing-red" />
                  )}
                </button>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
