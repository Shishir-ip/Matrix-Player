import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { MediaItem, SavedStream, StoredDirectoryHandle } from '../types';

interface MatrixDB extends DBSchema {
  media: {
    key: string;
    value: MediaItem;
    indexes: {
      'by-date': number;
      'by-folder': string;
      'by-favorite': number;
    };
  };
  playback_history: {
    key: string; // mediaId
    value: {
      id: string;
      title: string;
      currentTime: number;
      duration: number;
      lastPlayed: number;
      thumbnailUrl?: string;
    };
    indexes: {
      'by-last-played': number;
    };
  };
  saved_streams: {
    key: string;
    value: SavedStream;
    indexes: {
      'by-date': number;
      'by-group': string;
    };
  };
  directory_handles: {
    key: string;
    value: StoredDirectoryHandle;
  };
}

const DB_NAME = 'matrix_player_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<MatrixDB>> | null = null;

export async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MatrixDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Media store
        if (!db.objectStoreNames.contains('media')) {
          const mediaStore = db.createObjectStore('media', { keyPath: 'id' });
          mediaStore.createIndex('by-date', 'dateAdded');
          mediaStore.createIndex('by-folder', 'folder');
          mediaStore.createIndex('by-favorite', 'isFavorite');
        }

        // Playback history store
        if (!db.objectStoreNames.contains('playback_history')) {
          const historyStore = db.createObjectStore('playback_history', { keyPath: 'id' });
          historyStore.createIndex('by-last-played', 'lastPlayed');
        }

        // Saved network streams store
        if (!db.objectStoreNames.contains('saved_streams')) {
          const streamStore = db.createObjectStore('saved_streams', { keyPath: 'id' });
          streamStore.createIndex('by-date', 'lastPlayed');
          streamStore.createIndex('by-group', 'group');
        }

        // Directory handles store (version 2)
        if (!db.objectStoreNames.contains('directory_handles')) {
          db.createObjectStore('directory_handles', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// Media Operations
export async function getAllMedia(): Promise<MediaItem[]> {
  const db = await getDB();
  return db.getAll('media');
}

export async function saveMediaItem(item: MediaItem): Promise<void> {
  const db = await getDB();
  await db.put('media', item);
}

export async function saveMediaItems(items: MediaItem[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('media', 'readwrite');
  for (const item of items) {
    await tx.store.put(item);
  }
  await tx.done;
}

export async function deleteMediaItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('media', id);
}

export async function toggleFavoriteMedia(id: string): Promise<boolean> {
  const db = await getDB();
  const item = await db.get('media', id);
  if (item) {
    item.isFavorite = !item.isFavorite;
    await db.put('media', item);
    return item.isFavorite;
  }
  return false;
}

// Playback History
export async function savePlaybackProgress(
  id: string,
  title: string,
  currentTime: number,
  duration: number,
  thumbnailUrl?: string
) {
  const db = await getDB();
  await db.put('playback_history', {
    id,
    title,
    currentTime,
    duration,
    lastPlayed: Date.now(),
    thumbnailUrl,
  });

  // Also update media item if present
  const media = await db.get('media', id);
  if (media) {
    media.currentTime = currentTime;
    media.lastPlayed = Date.now();
    await db.put('media', media);
  }
}

export async function getPlaybackProgress(id: string) {
  const db = await getDB();
  return db.get('playback_history', id);
}

export async function getAllHistory() {
  const db = await getDB();
  const list = await db.getAllFromIndex('playback_history', 'by-last-played');
  return list.reverse();
}

// Saved Streams
export async function getAllSavedStreams(): Promise<SavedStream[]> {
  const db = await getDB();
  return db.getAll('saved_streams');
}

export async function saveStream(stream: SavedStream): Promise<void> {
  const db = await getDB();
  await db.put('saved_streams', stream);
}

export async function deleteStream(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('saved_streams', id);
}

// Directory Handles (File System Access API)
export async function getAllStoredDirectoryHandles(): Promise<StoredDirectoryHandle[]> {
  const db = await getDB();
  return db.getAll('directory_handles');
}

export async function saveStoredDirectoryHandle(handleInfo: StoredDirectoryHandle): Promise<void> {
  const db = await getDB();
  await db.put('directory_handles', handleInfo);
}

export async function deleteStoredDirectoryHandle(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('directory_handles', id);
}

export async function clearAllCache(): Promise<void> {
  const db = await getDB();
  await db.clear('media');
  await db.clear('playback_history');
  await db.clear('saved_streams');
  await db.clear('directory_handles');
}
