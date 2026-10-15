import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { parseSubtitles } from '../../lib/subtitleParser';
import { DotMatrixText } from '../common/DotMatrixText';
import { triggerHaptic } from '../../lib/haptics';

export const SubtitleTrackModal: React.FC = () => {
  const {
    isSubtitlesOpen,
    setModal,
    subtitles,
    activeSubtitleId,
    setActiveSubtitleId,
    addSubtitleTrack,
    subtitleOffsetMs,
    setSubtitleOffsetMs,
    audioTracks,
    currentAudioTrackId,
    setCurrentAudioTrackId,
  } = usePlayerStore();

  const { subtitleSize, setSubtitleSize, subtitleColor } = useSettingsStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isSubtitlesOpen) return null;

  // Handle external subtitle file upload (.srt, .vtt)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const cues = parseSubtitles(text);
      const newTrack = {
        id: `ext-${Date.now()}`,
        label: file.name.replace(/\.[^/.]+$/, ''),
        cues,
      };

      addSubtitleTrack(newTrack);
      setActiveSubtitleId(newTrack.id);
      triggerHaptic('success');
    } catch (err) {
      console.warn('Subtitle parse error:', err);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={() => setModal('subtitles', false)}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-nothing-surface1 border border-nothing-border rounded-nothing p-6 shadow-2xl relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-nothing-red shadow-[0_0_8px_#D71921]" />
              <DotMatrixText size="xl" weight="bold">
                TRACKS & SUBTITLES
              </DotMatrixText>
            </div>
            <button
              onClick={() => setModal('subtitles', false)}
              className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 hover:border-white text-zinc-400 hover:text-white flex items-center justify-center text-sm"
            >
              ✕
            </button>
          </div>

          {/* Audio Tracks Section */}
          {audioTracks.length > 1 && (
            <div className="mb-6">
              <span className="font-mono text-xs text-zinc-400 tracking-wider block mb-2">
                AUDIO STREAM TRACKS
              </span>
              <div className="flex flex-col gap-1.5">
                {audioTracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => {
                      triggerHaptic('tick');
                      setCurrentAudioTrackId(track.id);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border text-sm font-sans transition-all ${
                      currentAudioTrackId === track.id
                        ? 'border-nothing-red bg-zinc-900 text-white'
                        : 'border-zinc-800 bg-nothing-surface2 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <span>{track.name}</span>
                    {currentAudioTrackId === track.id && (
                      <span className="w-2 h-2 rounded-full bg-nothing-red" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subtitles Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-zinc-400 tracking-wider">
                SUBTITLE TRACKS
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="font-mono text-xs text-nothing-red hover:underline tracking-wider"
              >
                + LOAD SRT / VTT
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".srt,.vtt,.ass"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
              {/* Off Option */}
              <button
                onClick={() => {
                  triggerHaptic('tick');
                  setActiveSubtitleId(null);
                }}
                className={`flex items-center justify-between p-3 rounded-xl border text-sm font-sans transition-all ${
                  activeSubtitleId === null
                    ? 'border-nothing-red bg-zinc-900 text-white'
                    : 'border-zinc-800 bg-nothing-surface2 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span>None / Disabled</span>
                {activeSubtitleId === null && (
                  <span className="w-2 h-2 rounded-full bg-nothing-red" />
                )}
              </button>

              {subtitles.map((track) => (
                <button
                  key={track.id}
                  onClick={() => {
                    triggerHaptic('tick');
                    setActiveSubtitleId(track.id);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-sm font-sans transition-all ${
                    activeSubtitleId === track.id
                      ? 'border-nothing-red bg-zinc-900 text-white'
                      : 'border-zinc-800 bg-nothing-surface2 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="truncate max-w-[280px]">{track.label}</span>
                  {activeSubtitleId === track.id && (
                    <span className="w-2 h-2 rounded-full bg-nothing-red" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Sync Offset and Size */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-nothing-surface2 border border-zinc-800">
            <div>
              <span className="font-mono text-[11px] text-zinc-400 tracking-wider block mb-2">
                SYNC OFFSET ({subtitleOffsetMs}ms)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSubtitleOffsetMs(subtitleOffsetMs - 50)}
                  className="px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 font-mono text-xs text-white"
                >
                  -50ms
                </button>
                <button
                  onClick={() => setSubtitleOffsetMs(0)}
                  className="px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 font-mono text-xs text-zinc-400"
                >
                  0
                </button>
                <button
                  onClick={() => setSubtitleOffsetMs(subtitleOffsetMs + 50)}
                  className="px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 font-mono text-xs text-white"
                >
                  +50ms
                </button>
              </div>
            </div>

            <div>
              <span className="font-mono text-[11px] text-zinc-400 tracking-wider block mb-2">
                TEXT SIZE
              </span>
              <div className="flex items-center gap-1.5">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setSubtitleSize(size)}
                    className={`px-2.5 py-1 rounded font-mono text-xs uppercase ${
                      subtitleSize === size
                        ? 'bg-nothing-red text-white'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {size[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
