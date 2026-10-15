import React, { useState, useRef } from 'react';
import { useLibraryStore } from '../../store/useLibraryStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { detectEngineFromUrl, parseM3uPlaylist, ParsedM3uItem } from '../../lib/streamDetector';
import { MediaItem } from '../../types';
import { DotMatrixText } from '../common/DotMatrixText';
import { DotPlayIcon, DotNetworkTabIcon } from '../common/DotIcons';
import { createDotMatrixPlaceholder } from '../../lib/thumbnail';
import { triggerHaptic } from '../../lib/haptics';

export const NetworkStreamView: React.FC = () => {
  const { savedStreams, addSavedStream, removeSavedStream } = useLibraryStore();
  const { playMedia } = usePlayerStore();

  const [inputUrl, setInputUrl] = useState('');
  const [streamTitle, setStreamTitle] = useState('');
  const [iptvChannels, setIptvChannels] = useState<ParsedM3uItem[]>([]);
  const [iptvSearch, setIptvSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const playlistInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-detect format badge live as user types or pastes
  const detected = inputUrl ? detectEngineFromUrl(inputUrl) : null;

  // Paste from clipboard helper
  const handlePasteClipboard = async () => {
    triggerHaptic('light');
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text.trim());
      }
    } catch {
      // Permission or unsupported fallback
    }
  };

  // Play stream
  const handlePlayUrl = (urlToPlay: string, title?: string) => {
    const finalUrl = urlToPlay.trim();
    if (!finalUrl) return;

    triggerHaptic('medium');
    const detection = detectEngineFromUrl(finalUrl);
    let hostname = 'Stream';
    try {
      hostname = new URL(finalUrl).hostname;
    } catch {}

    const media: MediaItem = {
      id: `stream-${Date.now()}`,
      title: title || streamTitle || `${detection.format} (${hostname})`,
      url: finalUrl,
      type: 'video',
      format: detection.engine === 'hls' ? 'm3u8' : detection.engine === 'dash' ? 'mpd' : 'mp4',
      duration: 0,
      dateAdded: Date.now(),
      isNetworkStream: true,
      thumbnailUrl: createDotMatrixPlaceholder('LIVE'),
    };

    // Save to user saved streams
    addSavedStream({
      id: `saved-${Date.now()}`,
      title: media.title,
      url: finalUrl,
      format: detection.format,
      lastPlayed: Date.now(),
    });

    playMedia(media);
  };

  // Import M3U IPTV playlist
  const handleImportM3U = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      triggerHaptic('light');
      const text = await file.text();
      const channels = parseM3uPlaylist(text);
      setIptvChannels(channels);
      triggerHaptic('success');
    } catch (err) {
      console.warn('IPTV M3U parse failed:', err);
    }
  };

  // Filter IPTV channels
  const groups = ['ALL', ...Array.from(new Set(iptvChannels.map((c) => c.group || 'General')))];
  const filteredChannels = iptvChannels.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(iptvSearch.toLowerCase());
    const matchesGroup = selectedGroup === 'ALL' || c.group === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-12 select-none">
      {/* Big URL Stream Input Card */}
      <div className="rounded-3xl bg-nothing-surface1 border border-nothing-border p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-grid bg-dots-sm opacity-15 pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-nothing-red shadow-[0_0_8px_#D71921]" />
              <DotMatrixText size="xl" weight="bold">
                NETWORK STREAM
              </DotMatrixText>
            </div>
            {detected && (
              <span className="px-3 py-1 rounded-full bg-zinc-900 border border-nothing-red/50 text-nothing-red font-mono text-[0.75rem] font-semibold">
                {detected.format}
              </span>
            )}
          </div>

          <p className="font-mono text-[0.8125rem] text-zinc-400">
            Play live streams: HLS (.m3u8), DASH (.mpd), MPEG-TS (.ts, .flv), or direct video/audio URLs.
          </p>

          {/* URL Input Row with 52px (h-13) buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="https://example.com/live/playlist.m3u8"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePlayUrl(inputUrl);
                }}
                className="w-full h-[3.25rem] px-4 rounded-2xl bg-black border border-zinc-700/80 focus:border-nothing-red text-white font-mono text-[0.8125rem] placeholder:text-zinc-600 outline-none transition-colors"
              />
              {inputUrl && (
                <button
                  onClick={() => setInputUrl('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={handlePasteClipboard}
              className="h-[3.25rem] px-4 rounded-2xl bg-zinc-900 border border-zinc-700 hover:border-white font-mono text-[0.75rem] text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              PASTE
            </button>

            <button
              onClick={() => handlePlayUrl(inputUrl)}
              disabled={!inputUrl.trim()}
              className="h-[3.25rem] px-6 rounded-2xl bg-nothing-red hover:bg-red-700 disabled:opacity-40 disabled:pointer-events-none text-white font-mono text-[0.75rem] font-bold transition-all shadow-[0_0_16px_rgba(215,25,33,0.3)] flex items-center justify-center gap-2 flex-shrink-0"
            >
              <DotPlayIcon size={16} color="#fff" />
              PLAY
            </button>
          </div>

          {/* Optional Title input & IPTV playlist button */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <input
              type="text"
              placeholder="Optional Title (e.g. News Stream)"
              value={streamTitle}
              onChange={(e) => setStreamTitle(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[0.75rem] font-mono text-zinc-300 placeholder:text-zinc-600 outline-none w-64"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={() => playlistInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-500 font-mono text-[0.75rem] text-zinc-300 hover:text-white transition-all"
              >
                + IMPORT IPTV (.M3U)
              </button>
              <input
                ref={playlistInputRef}
                type="file"
                accept=".m3u,.m3u8"
                onChange={handleImportM3U}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* IPTV Channels list if loaded by user */}
      {iptvChannels.length > 0 && (
        <div className="rounded-3xl bg-nothing-surface1 border border-nothing-border p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-nothing-red" />
              <DotMatrixText size="lg" weight="bold">
                IPTV CHANNELS ({iptvChannels.length})
              </DotMatrixText>
            </div>
            <input
              type="text"
              placeholder="Search channels..."
              value={iptvSearch}
              onChange={(e) => setIptvSearch(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-black border border-zinc-800 font-mono text-xs text-white placeholder:text-zinc-600 outline-none w-48"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
            {groups.slice(0, 8).map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGroup(g)}
                className={`px-3 py-1 rounded-full font-mono text-xs flex-shrink-0 transition-all ${
                  selectedGroup === g
                    ? 'bg-nothing-red text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
            {filteredChannels.slice(0, 60).map((channel) => (
              <div
                key={channel.id}
                onClick={() => handlePlayUrl(channel.url, channel.name)}
                className="flex items-center justify-between p-3 rounded-2xl bg-nothing-surface2 border border-zinc-800/80 hover:border-zinc-500 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-8 h-8 rounded-lg bg-black border border-zinc-800 flex items-center justify-center flex-shrink-0">
                    <DotPlayIcon size={14} />
                  </div>
                  <span className="font-sans text-xs font-semibold text-white truncate">
                    {channel.name}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-zinc-500 flex-shrink-0 ml-2">
                  {channel.group || 'Live'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Saved Streams List (Completely empty initially) */}
      {savedStreams.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center p-6 text-center rounded-3xl bg-nothing-surface1/60 border border-nothing-border">
          <div className="w-14 h-14 rounded-full border border-zinc-800 bg-black flex items-center justify-center mb-3 text-zinc-600">
            <DotNetworkTabIcon size={24} />
          </div>
          <DotMatrixText size="base" color="muted" className="mb-1">
            NO STREAM HISTORY
          </DotMatrixText>
          <p className="font-mono text-[0.75rem] text-zinc-500 max-w-xs mb-4">
            Streams you play will be remembered here for instant one-tap access.
          </p>
          <button
            onClick={handlePasteClipboard}
            className="px-5 py-2.5 rounded-full bg-white text-black font-mono text-xs font-bold hover:bg-zinc-200 transition-all"
          >
            PASTE FROM CLIPBOARD
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <DotMatrixText size="base" color="muted">
              SAVED STREAMS ({savedStreams.length})
            </DotMatrixText>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {savedStreams.map((stream) => (
              <div
                key={stream.id}
                onClick={() => handlePlayUrl(stream.url, stream.title)}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-nothing-surface1 border border-nothing-border hover:border-zinc-500 hover:bg-[#141414] transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-black border border-zinc-800 flex items-center justify-center text-white flex-shrink-0 group-hover:border-nothing-red group-hover:text-nothing-red transition-colors">
                    <DotPlayIcon size={16} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-sans font-semibold text-white text-[0.875rem] truncate group-hover:text-zinc-200">
                      {stream.title}
                    </span>
                    <span className="font-mono text-[0.6875rem] text-zinc-500">
                      {stream.format}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handlePlayUrl(stream.url, stream.title)}
                    className="px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900 group-hover:border-white font-mono text-[0.6875rem] text-white transition-all"
                  >
                    PLAY
                  </button>
                  <button
                    onClick={() => removeSavedStream(stream.id)}
                    className="w-7 h-7 rounded-full text-zinc-600 hover:text-white flex items-center justify-center text-xs"
                    title="Remove stream"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
