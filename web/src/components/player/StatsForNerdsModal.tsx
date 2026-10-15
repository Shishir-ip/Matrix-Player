import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { DotMatrixText } from '../common/DotMatrixText';

export const StatsForNerdsModal: React.FC = () => {
  const { isStatsOpen, setModal, stats, currentMedia, playbackRate, volumeBoost } = usePlayerStore();

  if (!isStatsOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={() => setModal('stats', false)}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-nothing-surface1 border border-nothing-border rounded-nothing p-6 shadow-2xl relative font-mono text-xs"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-nothing-red shadow-[0_0_8px_#D71921]" />
              <DotMatrixText size="lg" weight="bold">
                STREAM DIAGNOSTICS
              </DotMatrixText>
            </div>
            <button
              onClick={() => setModal('stats', false)}
              className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-2.5 bg-black/60 p-4 rounded-xl border border-zinc-800">
            <div className="flex justify-between">
              <span className="text-zinc-500">PLAYBACK ENGINE</span>
              <span className="text-white font-bold uppercase">{stats?.engine || 'native'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">RESOLUTION</span>
              <span className="text-white">{stats?.resolution || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">BITRATE</span>
              <span className="text-white">
                {stats?.currentBitrate ? `${stats.currentBitrate} kbps` : 'Variable / Dynamic'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">BUFFER HEALTH</span>
              <span className="text-nothing-red font-bold">
                {stats?.bufferLength !== undefined ? `${stats.bufferLength}s` : '0s'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">FRAMES DROPPED</span>
              <span className="text-white">
                {stats?.droppedFrames || 0} / {stats?.decodedFrames || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">PLAYBACK SPEED</span>
              <span className="text-white">{playbackRate.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">AUDIO GAIN BOOST</span>
              <span className="text-white">{Math.round(volumeBoost * 100)}%</span>
            </div>
            <div className="flex justify-between truncate">
              <span className="text-zinc-500">MIME / CODEC</span>
              <span className="text-zinc-300 truncate max-w-[200px]">
                {currentMedia?.format || 'mp4'}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
