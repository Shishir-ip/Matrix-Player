import { create } from 'zustand';
import {
  MediaItem,
  AspectRatioMode,
  StreamQuality,
  AudioTrackInfo,
  SubtitleTrack,
  PlayerStats,
} from '../types';

interface PlayerState {
  currentMedia: MediaItem | null;
  queue: MediaItem[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0 to 1
  volumeBoost: number; // 1.0 to 2.0 (up to 200%)
  brightness: number; // 0.2 to 1.5
  playbackRate: number; // 0.25 to 4.0
  aspectMode: AspectRatioMode;
  zoomScale: number; // 1.0 to 3.0
  isFullscreen: boolean;
  isPiP: boolean;
  isLocked: boolean;
  isMiniPlayer: boolean;
  isNativePiP: boolean;
  isBuffering: boolean;
  errorMessage: string | null;

  // Stream & Tracks
  qualities: StreamQuality[];
  currentQualityId: number;
  audioTracks: AudioTrackInfo[];
  currentAudioTrackId: number;
  subtitles: SubtitleTrack[];
  activeSubtitleId: string | null;
  subtitleOffsetMs: number;

  // Modals & Panels
  isEqualizerOpen: boolean;
  isSubtitlesOpen: boolean;
  isQualityOpen: boolean;
  isStatsOpen: boolean;
  isQueueOpen: boolean;
  isSleepTimerOpen: boolean;
  isABRepeatOpen: boolean;

  // Stats
  stats: PlayerStats | null;

  // Extras
  sleepTimerEndTimestamp: number | null;
  loopMode: 'off' | 'all' | 'one' | 'ab';
  abRepeat: { start: number; end: number } | null;

  // Actions
  playMedia: (media: MediaItem, newQueue?: MediaItem[]) => void;
  addToQueue: (media: MediaItem) => void;
  removeFromQueue: (index: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setVolumeBoost: (boost: number) => void;
  setBrightness: (brightness: number) => void;
  setPlaybackRate: (rate: number) => void;
  setAspectMode: (mode: AspectRatioMode) => void;
  setZoomScale: (zoom: number) => void;
  setIsFullscreen: (full: boolean) => void;
  setIsPiP: (pip: boolean) => void;
  setIsLocked: (locked: boolean) => void;
  setIsMiniPlayer: (mini: boolean) => void;
  setIsNativePiP: (inPiP: boolean) => void;
  setIsBuffering: (buffering: boolean) => void;
  setErrorMessage: (msg: string | null) => void;
  setQualities: (qualities: StreamQuality[]) => void;
  setCurrentQualityId: (id: number) => void;
  setAudioTracks: (tracks: AudioTrackInfo[]) => void;
  setCurrentAudioTrackId: (id: number) => void;
  setSubtitles: (subs: SubtitleTrack[]) => void;
  addSubtitleTrack: (sub: SubtitleTrack) => void;
  setActiveSubtitleId: (id: string | null) => void;
  setSubtitleOffsetMs: (offset: number) => void;
  setStats: (stats: PlayerStats) => void;
  setModal: (
    modal:
      | 'equalizer'
      | 'subtitles'
      | 'quality'
      | 'stats'
      | 'queue'
      | 'sleep'
      | 'ab',
    open: boolean
  ) => void;
  setSleepTimer: (minutes: number | null) => void;
  setLoopMode: (mode: 'off' | 'all' | 'one' | 'ab') => void;
  setABRepeat: (ab: { start: number; end: number } | null) => void;
  closePlayer: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentMedia: null,
  queue: [],
  queueIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1.0,
  volumeBoost: 1.0,
  brightness: 1.0,
  playbackRate: 1.0,
  aspectMode: 'fit',
  zoomScale: 1.0,
  isFullscreen: false,
  isPiP: false,
  isLocked: false,
  isMiniPlayer: false,
  isNativePiP: false,
  isBuffering: false,
  errorMessage: null,

  qualities: [],
  currentQualityId: -1,
  audioTracks: [],
  currentAudioTrackId: 0,
  subtitles: [],
  activeSubtitleId: null,
  subtitleOffsetMs: 0,

  isEqualizerOpen: false,
  isSubtitlesOpen: false,
  isQualityOpen: false,
  isStatsOpen: false,
  isQueueOpen: false,
  isSleepTimerOpen: false,
  isABRepeatOpen: false,

  stats: null,
  sleepTimerEndTimestamp: null,
  loopMode: 'off',
  abRepeat: null,

  playMedia: (media, newQueue) => {
    const queue = newQueue || get().queue;
    const existingIndex = queue.findIndex((m) => m.id === media.id);
    const finalQueue = existingIndex >= 0 ? queue : [media, ...queue];
    const finalIndex = existingIndex >= 0 ? existingIndex : 0;

    set({
      currentMedia: media,
      queue: finalQueue,
      queueIndex: finalIndex,
      isPlaying: true,
      currentTime: media.currentTime || 0,
      duration: media.duration || 0,
      errorMessage: null,
      isMiniPlayer: false,
      zoomScale: 1.0,
      isBuffering: true,
    });
  },

  addToQueue: (media) => {
    set((state) => ({ queue: [...state.queue, media] }));
  },

  removeFromQueue: (index) => {
    set((state) => {
      const newQueue = state.queue.filter((_, i) => i !== index);
      let newIdx = state.queueIndex;
      if (index < state.queueIndex) newIdx--;
      return { queue: newQueue, queueIndex: Math.max(0, newIdx) };
    });
  },

  playNext: () => {
    const { queue, queueIndex } = get();
    if (queueIndex < queue.length - 1) {
      const nextMedia = queue[queueIndex + 1];
      set({
        currentMedia: nextMedia,
        queueIndex: queueIndex + 1,
        currentTime: 0,
        isPlaying: true,
        errorMessage: null,
      });
    }
  },

  playPrevious: () => {
    const { queue, queueIndex, currentTime } = get();
    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }
    if (queueIndex > 0) {
      const prevMedia = queue[queueIndex - 1];
      set({
        currentMedia: prevMedia,
        queueIndex: queueIndex - 1,
        currentTime: 0,
        isPlaying: true,
        errorMessage: null,
      });
    }
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  setVolumeBoost: (boost) => set({ volumeBoost: Math.max(1.0, Math.min(2.0, boost)) }),
  setBrightness: (b) => set({ brightness: Math.max(0.01, Math.min(1.0, b)) }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  setAspectMode: (mode) => set({ aspectMode: mode }),
  setZoomScale: (zoom) => set({ zoomScale: Math.max(0.5, Math.min(3.0, zoom)) }),
  setIsFullscreen: (full) => set({ isFullscreen: full }),
  setIsPiP: (pip) => set({ isPiP: pip }),
  setIsLocked: (locked) => set({ isLocked: locked }),
  setIsMiniPlayer: (mini) => set({ isMiniPlayer: mini }),
  setIsNativePiP: (inPiP) => set({ isNativePiP: inPiP }),
  setIsBuffering: (b) => set({ isBuffering: b }),
  setErrorMessage: (msg) => set({ errorMessage: msg }),
  setQualities: (qualities) => set({ qualities }),
  setCurrentQualityId: (id) => set({ currentQualityId: id }),
  setAudioTracks: (tracks) => set({ audioTracks: tracks }),
  setCurrentAudioTrackId: (id) => set({ currentAudioTrackId: id }),
  setSubtitles: (subs) => set({ subtitles: subs }),
  addSubtitleTrack: (sub) => set((s) => ({ subtitles: [...s.subtitles, sub] })),
  setActiveSubtitleId: (id) => set({ activeSubtitleId: id }),
  setSubtitleOffsetMs: (offset) => set({ subtitleOffsetMs: offset }),
  setStats: (stats) => set({ stats }),

  setModal: (modal, open) => {
    switch (modal) {
      case 'equalizer':
        set({ isEqualizerOpen: open });
        break;
      case 'subtitles':
        set({ isSubtitlesOpen: open });
        break;
      case 'quality':
        set({ isQualityOpen: open });
        break;
      case 'stats':
        set({ isStatsOpen: open });
        break;
      case 'queue':
        set({ isQueueOpen: open });
        break;
      case 'sleep':
        set({ isSleepTimerOpen: open });
        break;
      case 'ab':
        set({ isABRepeatOpen: open });
        break;
    }
  },

  setSleepTimer: (minutes) => {
    if (minutes === null) {
      set({ sleepTimerEndTimestamp: null });
    } else {
      set({ sleepTimerEndTimestamp: Date.now() + minutes * 60 * 1000 });
    }
  },

  setLoopMode: (mode) => set({ loopMode: mode }),
  setABRepeat: (ab) => set({ abRepeat: ab }),

  closePlayer: () => {
    set({
      currentMedia: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      isMiniPlayer: false,
      isNativePiP: false,
      errorMessage: null,
    });
  },
}));
