export type LayoutMode = 'auto' | 'phone' | 'tablet' | 'tv';
export type ActiveLayout = 'phone' | 'tablet' | 'tv';
export type AppTheme = 'dark' | 'amoled' | 'light';
export type ActiveTab = 'videos' | 'folders' | 'recent' | 'favorites' | 'network' | 'settings';
export type VideoFilterMode = 'all' | 'recent';
export type UiSize = 'compact' | 'default' | 'large';
export type SortOption = 'date' | 'name' | 'duration' | 'size' | 'folder';

export type AspectRatioMode = 'fit' | 'fill' | 'stretch' | '16:9' | '4:3' | '21:9' | 'original';

export type PlaybackEngineType = 'native' | 'hls' | 'dash' | 'mpegts';

export interface MediaItem {
  id: string;
  title: string;
  url: string; // Blob URL, object URL, or network stream URL
  type: 'video' | 'audio';
  format?: string; // mp4, m3u8, mpd, ts, etc.
  duration: number; // in seconds
  currentTime?: number;
  size?: number; // in bytes
  dateAdded: number;
  lastPlayed?: number;
  thumbnailUrl?: string; // data URL or cached thumbnail
  folder?: string;
  isFavorite?: boolean;
  isNetworkStream?: boolean;
  resolution?: { width: number; height: number };
  fileHandle?: any; // FileSystemFileHandle when supported
  directoryKey?: string;
  isRelinkNeeded?: boolean;
}

export interface StoredDirectoryHandle {
  id: string;
  name: string;
  handle: any; // FileSystemDirectoryHandle
  dateAdded: number;
  permissionState: 'granted' | 'prompt' | 'denied';
  fileCount: number;
}

export interface StreamQuality {
  id: number;
  label: string;
  bitrate?: number;
  width?: number;
  height?: number;
}

export interface AudioTrackInfo {
  id: number;
  name: string;
  lang?: string;
}

export interface SubtitleTrack {
  id: string;
  label: string;
  language?: string;
  src?: string; // VTT or SRT URL
  cues?: Array<{ start: number; end: number; text: string }>;
  isEmbedded?: boolean;
}

export interface PlayerStats {
  engine: PlaybackEngineType;
  resolution: string;
  currentBitrate: number; // kbps
  bufferLength: number; // seconds
  droppedFrames: number;
  decodedFrames: number;
  latency?: number;
  bandwidth?: number;
}

export interface EqualizerBand {
  frequency: number;
  gain: number; // -12 to +12 dB
}

export interface SavedStream {
  id: string;
  title: string;
  url: string;
  format: string;
  group?: string;
  lastPlayed?: number;
}
