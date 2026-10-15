import { create } from 'zustand';
import { MediaItem, ActiveTab, SavedStream, VideoFilterMode, StoredDirectoryHandle, SortOption } from '../types';
import {
  getAllMedia,
  saveMediaItem,
  saveMediaItems,
  deleteMediaItem,
  toggleFavoriteMedia,
  getAllSavedStreams,
  saveStream,
  deleteStream,
  getAllStoredDirectoryHandles,
  saveStoredDirectoryHandle,
  deleteStoredDirectoryHandle,
} from '../lib/db';
import { generateVideoThumbnail } from '../lib/thumbnail';
import { yieldToMain } from '../lib/performanceMonitor';

interface LibraryState {
  mediaItems: MediaItem[];
  savedStreams: SavedStream[];
  storedDirectoryHandles: StoredDirectoryHandle[];
  currentTab: ActiveTab;
  videoFilter: VideoFilterMode;
  searchQuery: string;
  sortBy: SortOption;
  sortOrder: 'asc' | 'desc';
  groupByDate: boolean;
  viewMode: 'list' | 'grid';
  activeFolder: string | null;
  selectedIds: string[];
  isMultiSelect: boolean;
  isLoading: boolean;
  isScanning: boolean;
  scanProgress: { current: number; total: number; message: string } | null;
  needsPermissionRestore: boolean;
  hasAndroidPermission: boolean;
  isAndroidBridgeAvailable: boolean;

  // Actions
  loadLibrary: () => Promise<void>;
  checkAndLoadDeviceMedia: () => Promise<void>;
  requestDevicePermission: () => void;
  setCurrentTab: (tab: ActiveTab) => void;
  setVideoFilter: (filter: VideoFilterMode) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: SortOption) => void;
  toggleSortOrder: () => void;
  setGroupByDate: (group: boolean) => void;
  setViewMode: (mode: 'list' | 'grid') => void;
  setActiveFolder: (folder: string | null) => void;
  toggleSelectId: (id: string) => void;
  clearSelection: () => void;
  setIsMultiSelect: (active: boolean) => void;
  addMediaItems: (items: MediaItem[]) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  addSavedStream: (stream: SavedStream) => Promise<void>;
  removeSavedStream: (id: string) => Promise<void>;
  requestRestoreAccess: () => Promise<void>;
  rescanDirectories: () => Promise<void>;
  scanDirectoryHandle: (dirHandle: any, folderName?: string) => Promise<number>;
  importFileList: (files: FileList | File[], defaultFolder?: string) => Promise<number>;
  relinkMediaItem: (item: MediaItem, newFile: File) => Promise<void>;
  updateMediaProgress: (id: string, currentTime: number, duration?: number) => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  mediaItems: [],
  savedStreams: [],
  storedDirectoryHandles: [],
  currentTab: 'videos',
  videoFilter: 'all',
  searchQuery: '',
  sortBy: 'date',
  sortOrder: 'desc',
  groupByDate: true, // Default to true: categorized by date
  viewMode: 'list', // Phone default is compact list row per requirement
  activeFolder: null,
  selectedIds: [],
  isMultiSelect: false,
  isLoading: true,
  isScanning: false,
  scanProgress: null,
  needsPermissionRestore: false,
  hasAndroidPermission: false,
  isAndroidBridgeAvailable: typeof window !== 'undefined' && Boolean((window as any).AndroidMedia),

  updateMediaProgress: (id: string, currentTime: number, duration?: number) => {
    set((state) => ({
      mediaItems: state.mediaItems.map((item) =>
        item.id === id
          ? {
              ...item,
              currentTime,
              duration: duration || item.duration,
              lastPlayed: Date.now(),
            }
          : item
      ),
    }));
  },

  loadLibrary: async () => {
    try {
      // Register global callback for native Android permission result
      if (typeof window !== 'undefined') {
        (window as any).onAndroidPermissionResult = (granted: boolean) => {
          set({ hasAndroidPermission: granted });
          if (granted) {
            get().checkAndLoadDeviceMedia();
          }
        };
      }

      const androidMedia = typeof window !== 'undefined' ? (window as any).AndroidMedia : null;
      const isBridge = Boolean(androidMedia);
      set({ isAndroidBridgeAvailable: isBridge });

      if (isBridge) {
        const hasPerm = Boolean(androidMedia.hasPermission && androidMedia.hasPermission());
        set({ hasAndroidPermission: hasPerm });
        if (hasPerm) {
          await get().checkAndLoadDeviceMedia();
        } else {
          setTimeout(() => {
            const am = (window as any).AndroidMedia;
            if (am && am.hasPermission && am.hasPermission()) {
              set({ hasAndroidPermission: true });
              get().checkAndLoadDeviceMedia();
            }
          }, 400);
        }
      }

      const items = await getAllMedia();
      const streams = await getAllSavedStreams();
      const handles = await getAllStoredDirectoryHandles();

      // Check if any directory handles need permission restore
      let needsRestore = false;
      for (const h of handles) {
        if (h.handle && typeof h.handle.queryPermission === 'function') {
          try {
            const status = await h.handle.queryPermission({ mode: 'read' });
            if (status !== 'granted') {
              needsRestore = true;
            }
          } catch {
            needsRestore = true;
          }
        }
      }

      // If items have blob URLs from previous session and no directory handle was restored yet,
      // mark them as relink needed so the user is informed with RELINK button rather than a broken player
      const validatedItems = (get().mediaItems.length > 0 ? get().mediaItems : items).map((m) => {
        if (m.isNetworkStream || m.url.startsWith('http://') || m.url.startsWith('https://')) {
          return m;
        }
        if (m.url.startsWith('blob:') && needsRestore) {
          return { ...m, isRelinkNeeded: true };
        }
        return m;
      });

      set({
        mediaItems: validatedItems,
        savedStreams: streams,
        storedDirectoryHandles: handles,
        needsPermissionRestore: needsRestore,
        isLoading: false,
      });
    } catch (e) {
      console.warn('Failed to load library:', e);
      set({ isLoading: false });
    }
  },

  checkAndLoadDeviceMedia: async () => {
    const androidMedia = typeof window !== 'undefined' ? (window as any).AndroidMedia : null;
    if (!androidMedia) {
      set({ isAndroidBridgeAvailable: false });
      return;
    }

    set({ isAndroidBridgeAvailable: true });
    const hasPerm = Boolean(androidMedia.hasPermission && androidMedia.hasPermission());
    set({ hasAndroidPermission: hasPerm });

    if (!hasPerm) {
      set({ isLoading: false });
      return;
    }

    try {
      set({ isScanning: true, scanProgress: { current: 1, total: 1, message: 'LOADING STORAGE VIDEOS' } });
      const jsonStr = androidMedia.getVideosJson ? androidMedia.getVideosJson() : '[]';
      const deviceVideos: MediaItem[] = JSON.parse(jsonStr || '[]');

      // Query existing stored media items from DB to preserve favorites & resume positions
      let existingItems: MediaItem[] = [];
      try {
        existingItems = await getAllMedia();
      } catch (err) {
        console.warn('getAllMedia error:', err);
      }
      const existingMap = new Map(existingItems.map((item) => [item.id, item]));

      const mergedVideos = deviceVideos.map((video) => {
        const prev = existingMap.get(video.id);
        if (prev) {
          return {
            ...video,
            isFavorite: prev.isFavorite ?? false,
            currentTime: prev.currentTime ?? 0,
            lastPlayed: prev.lastPlayed,
          };
        }
        return video;
      });

      // Also keep user-imported files or network streams from existing items
      const nonDeviceItems = existingItems.filter((item) => !item.id.startsWith('device-'));
      const allItems = [...mergedVideos, ...nonDeviceItems];

      try {
        await saveMediaItems(allItems);
      } catch (err) {
        console.warn('saveMediaItems error:', err);
      }

      set({
        mediaItems: allItems,
        hasAndroidPermission: true,
        isScanning: false,
        scanProgress: null,
        isLoading: false,
      });
    } catch (e) {
      console.warn('Failed to parse device videos from AndroidMedia:', e);
      set({ isScanning: false, scanProgress: null, isLoading: false });
    }
  },

  requestDevicePermission: () => {
    const androidMedia = typeof window !== 'undefined' ? (window as any).AndroidMedia : null;
    if (androidMedia && typeof androidMedia.requestPermission === 'function') {
      androidMedia.requestPermission();
    }
  },

  setCurrentTab: (tab) => set({ currentTab: tab, activeFolder: null }),
  setVideoFilter: (filter) => set({ videoFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sort) => set({ sortBy: sort }),
  toggleSortOrder: () => set((s) => ({ sortOrder: s.sortOrder === 'asc' ? 'desc' : 'asc' })),
  setGroupByDate: (group) => set({ groupByDate: group }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setActiveFolder: (folder) => set({ activeFolder: folder }),

  toggleSelectId: (id) => {
    set((s) => {
      const exists = s.selectedIds.includes(id);
      const newIds = exists ? s.selectedIds.filter((item) => item !== id) : [...s.selectedIds, id];
      return {
        selectedIds: newIds,
        isMultiSelect: newIds.length > 0,
      };
    });
  },

  clearSelection: () => set({ selectedIds: [], isMultiSelect: false }),
  setIsMultiSelect: (active) => set({ isMultiSelect: active, selectedIds: [] }),

  addMediaItems: async (newItems) => {
    await saveMediaItems(newItems);
    set((s) => {
      const existingMap = new Map(s.mediaItems.map((m) => [m.id, m]));
      newItems.forEach((item) => existingMap.set(item.id, item));
      return { mediaItems: Array.from(existingMap.values()) };
    });
  },

  removeItem: async (id) => {
    await deleteMediaItem(id);
    set((s) => ({ mediaItems: s.mediaItems.filter((m) => m.id !== id) }));
  },

  toggleFavorite: async (id) => {
    const isFav = await toggleFavoriteMedia(id);
    set((s) => ({
      mediaItems: s.mediaItems.map((m) => (m.id === id ? { ...m, isFavorite: isFav } : m)),
    }));
  },

  addSavedStream: async (stream) => {
    await saveStream(stream);
    set((s) => ({ savedStreams: [stream, ...s.savedStreams.filter((x) => x.id !== stream.id)] }));
  },

  removeSavedStream: async (id) => {
    await deleteStream(id);
    set((s) => ({ savedStreams: s.savedStreams.filter((str) => str.id !== id) }));
  },

  requestRestoreAccess: async () => {
    const handles = get().storedDirectoryHandles;
    let anyGranted = false;

    for (const h of handles) {
      if (h.handle && typeof h.handle.requestPermission === 'function') {
        try {
          const res = await h.handle.requestPermission({ mode: 'read' });
          if (res === 'granted') {
            anyGranted = true;
          }
        } catch (e) {
          console.warn('Permission request error:', e);
        }
      }
    }

    if (anyGranted) {
      set({ needsPermissionRestore: false });
      await get().rescanDirectories();
    }
  },

  /**
   * Rescan all registered folders and detect new, changed, and removed media
   */
  rescanDirectories: async () => {
    const androidMedia = typeof window !== 'undefined' ? (window as any).AndroidMedia : null;
    if (androidMedia) {
      set({ isScanning: true, scanProgress: { current: 1, total: 1, message: 'RESCANNING DEVICE STORAGE' } });
      await get().checkAndLoadDeviceMedia();
      set({ isScanning: false, scanProgress: null });
      return;
    }

    const handles = get().storedDirectoryHandles;
    if (handles.length === 0) return;

    set({ isScanning: true, scanProgress: { current: 0, total: handles.length, message: 'RESCANNING DIRECTORIES' } });

    for (let i = 0; i < handles.length; i++) {
      const h = handles[i];
      if (h.handle) {
        try {
          await get().scanDirectoryHandle(h.handle, h.name);
        } catch (e) {
          console.warn('Rescan error for handle:', h.name, e);
        }
      }
    }

    set({ isScanning: false, scanProgress: null });
  },

  /**
   * Non-blocking recursive directory scanner with sliced execution
   */
  scanDirectoryHandle: async (dirHandle: any, folderName?: string): Promise<number> => {
    const rootName = folderName || dirHandle.name || 'Folder';
    const collectedFiles: { file: File; handle: any; parentFolder: string }[] = [];

    set({ isScanning: true, scanProgress: { current: 0, total: 1, message: `SCANNING ${rootName}` } });

    // Recursive directory traversal with time-slicing
    async function scanFolder(folderHandle: any, currentPath: string) {
      for await (const entry of folderHandle.values()) {
        await yieldToMain();

        if (entry.kind === 'file') {
          const lower = entry.name.toLowerCase();
          const isMedia =
            lower.endsWith('.mp4') ||
            lower.endsWith('.mkv') ||
            lower.endsWith('.mov') ||
            lower.endsWith('.webm') ||
            lower.endsWith('.mp3') ||
            lower.endsWith('.m4a') ||
            lower.endsWith('.aac') ||
            lower.endsWith('.flac') ||
            lower.endsWith('.wav') ||
            lower.endsWith('.ogg');

          if (isMedia) {
            try {
              const file = await entry.getFile();
              collectedFiles.push({ file, handle: entry, parentFolder: currentPath });
            } catch {}
          }
        } else if (entry.kind === 'directory') {
          await scanFolder(entry, `${currentPath}/${entry.name}`);
        }
      }
    }

    try {
      await scanFolder(dirHandle, rootName);

      // Save directory handle in IndexedDB
      await saveStoredDirectoryHandle({
        id: `dir-${rootName}`,
        name: rootName,
        handle: dirHandle,
        dateAdded: Date.now(),
        permissionState: 'granted',
        fileCount: collectedFiles.length,
      });

      // Update stored handles in memory
      const updatedHandles = await getAllStoredDirectoryHandles();
      set({ storedDirectoryHandles: updatedHandles });

      // Process collected files in slices with live progress display
      const newItems: MediaItem[] = [];
      const total = collectedFiles.length;

      for (let i = 0; i < total; i++) {
        const item = collectedFiles[i];
        set({
          scanProgress: {
            current: i + 1,
            total,
            message: `SCANNING ${i + 1} / ${total}: ${item.file.name}`,
          },
        });

        await yieldToMain();

        const ext = item.file.name.split('.').pop()?.toLowerCase() || 'mp4';
        const isAudio = item.file.type.startsWith('audio/') || ['mp3', 'aac', 'flac', 'wav', 'ogg', 'm4a'].includes(ext);

        const objectUrl = URL.createObjectURL(item.file);
        const { thumbnailUrl, duration, resolution } = await generateVideoThumbnail(item.file);

        const mediaItem: MediaItem = {
          id: `file-${rootName}-${item.file.name}-${item.file.size}`,
          title: item.file.name.replace(/\.[^/.]+$/, ''),
          url: objectUrl,
          type: isAudio ? 'audio' : 'video',
          format: ext,
          duration: duration || 0,
          size: item.file.size,
          dateAdded: item.file.lastModified || Date.now(),
          folder: item.parentFolder,
          thumbnailUrl,
          resolution,
          fileHandle: item.handle,
          directoryKey: `dir-${rootName}`,
        };

        newItems.push(mediaItem);
      }

      await get().addMediaItems(newItems);
      set({ isScanning: false, scanProgress: null });
      return newItems.length;
    } catch (err) {
      console.warn('Folder scan error:', err);
      set({ isScanning: false, scanProgress: null });
      return 0;
    }
  },

  /**
   * Import multiple files (from system picker or webkitdirectory) with sliced execution and progress
   */
  importFileList: async (files: FileList | File[], defaultFolder?: string): Promise<number> => {
    const fileArray = Array.from(files).filter((file) => {
      const type = file.type.toLowerCase();
      const name = file.name.toLowerCase();
      return (
        type.startsWith('video/') ||
        type.startsWith('audio/') ||
        name.endsWith('.mp4') ||
        name.endsWith('.mkv') ||
        name.endsWith('.mov') ||
        name.endsWith('.webm') ||
        name.endsWith('.avi') ||
        name.endsWith('.ts') ||
        name.endsWith('.flv') ||
        name.endsWith('.m4v') ||
        name.endsWith('.3gp') ||
        name.endsWith('.mp3') ||
        name.endsWith('.aac') ||
        name.endsWith('.flac') ||
        name.endsWith('.wav') ||
        name.endsWith('.ogg') ||
        name.endsWith('.m4a')
      );
    });

    if (fileArray.length === 0) return 0;

    const total = fileArray.length;
    set({
      isScanning: true,
      scanProgress: {
        current: 0,
        total,
        message: `SCANNING 0 / ${total}`,
      },
    });

    const newItems: MediaItem[] = [];

    for (let i = 0; i < total; i++) {
      const file = fileArray[i];
      set({
        scanProgress: {
          current: i + 1,
          total,
          message: `SCANNING ${i + 1} / ${total}`,
        },
      });

      await yieldToMain();

      try {
        const objectUrl = URL.createObjectURL(file);
        const { thumbnailUrl, duration, resolution } = await generateVideoThumbnail(file);

        const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
        const isAudio =
          file.type.startsWith('audio/') ||
          ['mp3', 'aac', 'flac', 'wav', 'ogg', 'm4a'].includes(ext);

        let folderName = defaultFolder || 'Imports';
        if ((file as any).webkitRelativePath) {
          const parts = (file as any).webkitRelativePath.split('/');
          if (parts.length > 1) {
            folderName = parts[parts.length - 2];
          }
        }

        const item: MediaItem = {
          id: `file-${Date.now()}-${i}-${file.name.replace(/[^a-zA-Z0-9]/g, '')}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          url: objectUrl,
          type: isAudio ? 'audio' : 'video',
          format: ext,
          duration: duration || 0,
          size: file.size,
          dateAdded: file.lastModified || Date.now(),
          folder: folderName,
          thumbnailUrl,
          resolution,
        };

        newItems.push(item);
      } catch (err) {
        console.warn('Failed to parse file:', file.name, err);
      }
    }

    if (newItems.length > 0) {
      await get().addMediaItems(newItems);
    }

    set({ isScanning: false, scanProgress: null });
    return newItems.length;
  },

  relinkMediaItem: async (item: MediaItem, newFile: File) => {
    const objectUrl = URL.createObjectURL(newFile);
    const { thumbnailUrl, duration, resolution } = await generateVideoThumbnail(newFile);

    const updated: MediaItem = {
      ...item,
      url: objectUrl,
      size: newFile.size,
      duration: duration || item.duration,
      thumbnailUrl: thumbnailUrl || item.thumbnailUrl,
      resolution: resolution || item.resolution,
      isRelinkNeeded: false,
    };

    await saveMediaItem(updated);
    set((s) => ({
      mediaItems: s.mediaItems.map((m) => (m.id === item.id ? updated : m)),
    }));
  },
}));
