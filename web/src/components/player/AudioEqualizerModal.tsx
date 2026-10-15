import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { audioEffects, EQ_FREQUENCIES, EQ_PRESETS } from '../../lib/audioEffects';
import { DotMatrixText } from '../common/DotMatrixText';
import { DotMatrixVisualizer } from '../common/DotMatrixVisualizer';
import { triggerHaptic } from '../../lib/haptics';

export const AudioEqualizerModal: React.FC = () => {
  const { isEqualizerOpen, setModal, volumeBoost, setVolumeBoost, isPlaying } = usePlayerStore();
  const [bandGains, setBandGains] = useState<number[]>([0, 0, 0, 0, 0]);
  const [activePreset, setActivePreset] = useState<string>('Flat');

  if (!isEqualizerOpen) return null;

  const handleBandChange = (index: number, gain: number) => {
    const newGains = [...bandGains];
    newGains[index] = gain;
    setBandGains(newGains);
    setActivePreset('Custom');
    audioEffects.setBandGain(index, gain);
  };

  const handleSelectPreset = (presetName: string) => {
    triggerHaptic('tick');
    setActivePreset(presetName);
    const gains = EQ_PRESETS[presetName] || [0, 0, 0, 0, 0];
    setBandGains(gains);
    audioEffects.applyPreset(presetName);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={() => setModal('equalizer', false)}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-nothing-surface1 border border-nothing-border rounded-nothing p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-nothing-red shadow-[0_0_8px_#D71921]" />
              <DotMatrixText size="xl" weight="bold">
                EQUALIZER & BOOST
              </DotMatrixText>
            </div>
            <button
              onClick={() => setModal('equalizer', false)}
              className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 hover:border-white text-zinc-400 hover:text-white flex items-center justify-center text-sm"
            >
              ✕
            </button>
          </div>

          {/* Mini Real-time Visualizer */}
          <div className="flex justify-center mb-6 py-2 bg-black/50 border border-zinc-800/80 rounded-xl">
            <DotMatrixVisualizer isPlaying={isPlaying} barCount={20} dotsPerBar={8} />
          </div>

          {/* Volume Boost Slider (Up to 200%) */}
          <div className="mb-6 p-4 rounded-xl bg-nothing-surface2 border border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-zinc-300 tracking-wider">
                VOLUME BOOST (GAIN)
              </span>
              <span className={`font-doto text-sm font-bold ${volumeBoost > 1.0 ? 'text-nothing-red' : 'text-white'}`}>
                {Math.round(volumeBoost * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="2.0"
              step="0.05"
              value={volumeBoost}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolumeBoost(val);
                triggerHaptic('tick');
              }}
              className="w-full accent-nothing-red cursor-pointer"
            />
            <div className="flex justify-between font-mono text-[10px] text-zinc-500 mt-1">
              <span>100% (Standard)</span>
              <span>150%</span>
              <span>200% (High Boost)</span>
            </div>
          </div>

          {/* Presets Pills */}
          <div className="mb-6">
            <span className="font-mono text-[11px] text-zinc-400 tracking-wider block mb-2">
              PRESETS
            </span>
            <div className="flex flex-wrap gap-2">
              {Object.keys(EQ_PRESETS).map((name) => (
                <button
                  key={name}
                  onClick={() => handleSelectPreset(name)}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-all ${
                    activePreset === name
                      ? 'bg-nothing-red text-white shadow-[0_0_8px_#D71921] border border-nothing-red'
                      : 'bg-nothing-surface2 text-zinc-400 border border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* 5 Frequency Bands */}
          <div className="grid grid-cols-5 gap-2 pt-2">
            {EQ_FREQUENCIES.map((freq, idx) => {
              const label = freq < 1000 ? `${freq}Hz` : `${freq / 1000}kHz`;
              const gain = bandGains[idx] || 0;
              return (
                <div key={freq} className="flex flex-col items-center gap-2">
                  <span className="font-doto text-xs font-bold text-zinc-300">
                    {gain > 0 ? `+${gain}` : gain}dB
                  </span>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    value={gain}
                    onChange={(e) => handleBandChange(idx, parseInt(e.target.value))}
                    className="h-28 [writing-mode:vertical-lr] [direction:rtl] accent-nothing-red cursor-pointer"
                  />
                  <span className="font-mono text-[10px] text-zinc-500 mt-1">{label}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
