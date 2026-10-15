import React, { useState, useRef, useTransition, useMemo } from 'react';
import { useLibraryStore } from '../store/useLibraryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { ContinueWatchingHero } from '../components/library/ContinueWatchingHero';
import { MediaCard } from '../components/library/MediaCard';
import { FolderCard } from '../components/library/FolderCard';
import { AddMediaModal } from '../components/library/AddMediaModal';
import { WelcomeOnboarding } from '../components/library/WelcomeOnboarding';
import { NetworkStreamView } from '../components/stream/NetworkStreamView';
import { DotMatrixText } from '../components/common/DotMatrixText';
import { DotMatrixSpinner } from '../components/common/DotMatrixSpinner';
import {
  DotListIcon,
  DotGridIcon,
  DotRescanIcon,
  DotVideosTabIcon,
  DotFoldersTabIcon,
  DotFavoritesTabIcon,
  DotRecentIcon,
  DotSettingsIcon,
} from '../components/common/DotIcons';
import { MediaItem } from '../types';
import { triggerHaptic } from '../lib/haptics';

interface HomeScreenProps {
  onOpenSettings?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenSettings }) => {
  const {
    mediaItems,
    currentTab,
    setCurrentTab,
    videoFilter,
    setVideoFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    toggleSortOrder,
    groupByDate,
    setGroupByDate,
    viewMode,
    setViewMode,
    activeFolder,
    setActiveFolder,
    selectedIds,
    isMultiSelect,
    toggleSelectId,
    clearSelection,
    setIsMultiSelect,
    addMediaItems,
    removeItem,
    toggleFavorite,
    isLoading,
    isScanning,
    scanProgress,
    needsPermissionRestore,
    requestRestoreAccess,
    rescanDirectories,
    scanDirectoryHandle,
    importFileList,
    relinkMediaItem,
    hasAndroidPermission,
    isAndroidBridgeAvailable,
    requestDevicePermission,
  } = useLibraryStore();

  const { playMedia, addToQueue } = usePlayerStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [relinkTargetItem, setRelinkTargetItem] = useState<MediaItem | null>(null);
  const relinkInputRef = useRef<HTMLInputElement | null>(null);
  const quickFileInputRef = useRef<HTMLInputElement | null>(null);
  const folderPickerInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullReady, setIsPullReady] = useState(false);
  const touchStartYRef = useRef(0);
  const isPullingRef = useRef(false);

  const [, startTransition] = useTransition();

  // Register Home Screen back navigation (modals, selection, search, folder view)
  React.useEffect(() => {
    (window as any).handleHomeBack = () => {
      if (isAddModalOpen) {
        setIsAddModalOpen(false);
        return true;
      }
      if (isMultiSelect || selectedIds.length > 0) {
        clearSelection();
        setIsMultiSelect(false);
        return true;
      }
      if (searchQuery) {
        setSearchQuery('');
        return true;
      }
      if (activeFolder) {
        setActiveFolder(null);
        return true;
      }
      return false;
    };
    return () => {
      delete (window as any).handleHomeBack;
    };
  }, [isAddModalOpen, isMultiSelect, selectedIds, searchQuery, activeFolder, clearSelection, setIsMultiSelect, setSearchQuery, setActiveFolder]);

  const hasDirectoryPicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  const hasWebkitDirectory = typeof HTMLInputElement !== 'undefined' && 'webkitdirectory' in HTMLInputElement.prototype;
  const isFolderSupported = hasDirectoryPicker || hasWebkitDirectory;

  // Handle direct folder picking from Welcome or Empty state
  const handleDirectPickFolder = async () => {
    triggerHaptic('medium');
    if (hasDirectoryPicker) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        await scanDirectoryHandle(dirHandle);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          folderPickerInputRef.current?.click();
        }
      }
    } else if (hasWebkitDirectory) {
      folderPickerInputRef.current?.click();
    }
  };

  // Handle files selected via file input or folder input
  const handleDirectAddFiles = async (files: FileList | File[]) => {
    triggerHaptic('medium');
    await importFileList(files);
    triggerHaptic('success');
  };

  // Pull to refresh touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollContainerRef.current && scrollContainerRef.current.scrollTop <= 0) {
      touchStartYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    } else {
      isPullingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartYRef.current;
    if (diff > 0) {
      const distance = Math.min(85, diff * 0.42);
      setPullDistance(distance);
      setIsPullReady(distance >= 55);
    } else {
      setPullDistance(0);
      setIsPullReady(false);
    }
  };

  const handleTouchEnd = async () => {
    if (isPullReady) {
      triggerHaptic('medium');
      setPullDistance(0);
      setIsPullReady(false);
      isPullingRef.current = false;
      await rescanDirectories();
    } else {
      setPullDistance(0);
      setIsPullReady(false);
      isPullingRef.current = false;
    }
  };

  // Relink file picker handler
  const handleRelinkFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && relinkTargetItem) {
      triggerHaptic('medium');
      await relinkMediaItem(relinkTargetItem, file);
      setRelinkTargetItem(null);
    }
  };

  // Determine Continue Watching item (ONLY when there is something to resume!)
  const continueWatchingItem = mediaItems.find(
    (item) => item.currentTime && item.currentTime > 5 && item.currentTime < (item.duration || 100) * 0.95
  );

  // Format date header for categorization
  const formatDateHeader = (timestamp: number): string => {
    if (!timestamp) return 'UNKNOWN DATE';
    const date = new Date(timestamp);
    const now = new Date();

    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'TODAY';
    if (diffDays === 1) return 'YESTERDAY';
    if (diffDays < 7 && diffDays > 0) return 'THIS WEEK';
    if (diffDays < 30 && diffDays > 0) return 'THIS MONTH';

    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString(undefined, { month: 'long' }).toUpperCase();
    }
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toUpperCase();
  };

  // Group media by folders
  const foldersMap = mediaItems.reduce<Record<string, MediaItem[]>>((acc, item) => {
    const f = item.folder || 'Storage';
    if (!acc[f]) acc[f] = [];
    acc[f].push(item);
    return acc;
  }, {});

  // Filter items by current tab, active folder, search query, and ALL / RECENT filter
  let filteredItems = mediaItems.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!item.title.toLowerCase().includes(q) && !item.folder?.toLowerCase().includes(q)) {
        return false;
      }
    }

    if (activeFolder && item.folder !== activeFolder) {
      return false;
    }

    if (currentTab === 'favorites') {
      return item.isFavorite;
    }

    if (currentTab === 'recent') {
      return item.lastPlayed && item.lastPlayed > 0;
    }

    if (currentTab === 'videos' && videoFilter === 'recent') {
      return item.lastPlayed && item.lastPlayed > 0;
    }

    return true;
  });

  // Sort items
  if (currentTab === 'recent') {
    filteredItems.sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
  } else {
    filteredItems.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'duration':
          comparison = (a.duration || 0) - (b.duration || 0);
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'folder':
          comparison = (a.folder || '').localeCompare(b.folder || '');
          break;
        case 'date':
        default:
          comparison = (a.dateAdded || 0) - (b.dateAdded || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  // Date Categorization grouping (used when groupByDate is true on Videos tab)
  const dateGroups = useMemo(() => {
    if (!groupByDate || currentTab !== 'videos' || sortBy !== 'date' || activeFolder || searchQuery) {
      return null;
    }
    const map = new Map<string, MediaItem[]>();

    filteredItems.forEach((item) => {
      const header = formatDateHeader(item.dateAdded);
      if (!map.has(header)) {
        map.set(header, []);
      }
      map.get(header)!.push(item);
    });

    const groups: { category: string; items: MediaItem[] }[] = [];
    map.forEach((items, category) => {
      groups.push({ category, items });
    });

    return groups.length > 0 ? groups : null;
  }, [groupByDate, currentTab, sortBy, activeFolder, searchQuery, filteredItems]);

  // Multi-select actions
  const handleBatchPlay = () => {
    const selected = mediaItems.filter((m) => selectedIds.includes(m.id));
    if (selected.length > 0) {
      playMedia(selected[0], selected);
      clearSelection();
    }
  };

  const handleBatchDelete = async () => {
    for (const id of selectedIds) {
      await removeItem(id);
    }
    clearSelection();
  };

  const pageTitle = activeFolder
    ? activeFolder.toUpperCase()
    : currentTab.toUpperCase();

  // If first launch / no media has been added yet and on Videos/Folders/Favorites tab
  const isLibraryEmpty = mediaItems.length === 0;

  return (
    <div
      ref={scrollContainerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        paddingTop: 'calc(var(--safe-top) + 12px)',
        paddingBottom: 'calc(var(--bottom-nav-height) + 16px)',
      }}
      className="flex-1 w-full flex flex-col px-4 md:px-8 overflow-y-auto select-none relative"
    >
      {/* Pull-to-refresh Indicator */}
      {pullDistance > 0 && (
        <div
          style={{ height: pullDistance }}
          className="w-full flex items-center justify-center overflow-hidden transition-all text-nothing-red font-mono text-[0.75rem] font-bold tracking-widest gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-nothing-red animate-ping" />
          <span>{isPullReady ? 'RELEASE TO RESCAN' : 'PULL TO RESCAN'}</span>
        </div>
      )}

      {/* Hidden Relink File Input */}
      <input
        ref={relinkInputRef}
        type="file"
        accept="video/*,audio/*"
        onChange={handleRelinkFileSelected}
        className="hidden"
      />
      <input
        ref={quickFileInputRef}
        type="file"
        multiple
        accept="video/*,audio/*,.mkv,.mp4,.mov,.webm,.mp3,.aac,.flac,.wav,.ogg,.m4a"
        onChange={(e) => e.target.files && handleDirectAddFiles(e.target.files)}
        className="hidden"
      />
      <input
        ref={folderPickerInputRef}
        type="file"
        multiple
        {...({ webkitdirectory: '', directory: '' } as any)}
        onChange={(e) => e.target.files && handleDirectAddFiles(e.target.files)}
        className="hidden"
      />

      {/* Permission Restore Banner when user revisits app */}
      {needsPermissionRestore && (
        <div className="mb-4 p-3.5 rounded-2xl bg-zinc-900 border border-nothing-red flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-nothing-red animate-pulse" />
            <span className="font-mono text-[0.75rem] text-white font-semibold">
              TAP TO RESTORE FOLDER ACCESS
            </span>
          </div>
          <button
            onClick={() => {
              triggerHaptic('medium');
              requestRestoreAccess();
            }}
            className="px-3 py-1.5 rounded-xl bg-nothing-red text-white font-mono text-[0.6875rem] font-bold shadow-[0_0_8px_#D71921]"
          >
            GRANT
          </button>
        </div>
      )}

      {/* Live Scanning Progress Banner */}
      {isScanning && scanProgress && (
        <div className="mb-4 p-3.5 rounded-2xl bg-nothing-surface1 border border-zinc-700 flex flex-col gap-2 shadow-xl">
          <div className="flex items-center justify-between font-mono text-[0.75rem] text-white">
            <span className="font-bold">{scanProgress.message}</span>
            <span className="text-nothing-red font-bold">
              {scanProgress.total > 0 ? `${Math.round((scanProgress.current / scanProgress.total) * 100)}%` : ''}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-nothing-red transition-all duration-150"
              style={{
                width: `${scanProgress.total > 0 ? (scanProgress.current / scanProgress.total) * 100 : 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Top App Bar Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 mb-4">
        <div className="flex items-center gap-3">
          <DotMatrixText size="3xl" weight="black" className="leading-none">
            {pageTitle}
          </DotMatrixText>
          {activeFolder && (
            <button
              onClick={() => setActiveFolder(null)}
              className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-700 font-mono text-[0.6875rem] text-zinc-300 hover:text-white"
            >
              ← FOLDERS
            </button>
          )}
        </div>

        {/* Search Field & Import Button & Settings Button */}
        <div className="flex items-center gap-2">
          {currentTab !== 'network' && (
            <div className="relative flex-1 sm:w-60">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  startTransition(() => setSearchQuery(val));
                }}
                className="w-full h-[3rem] px-4 rounded-full bg-nothing-surface1 border border-nothing-border focus:border-white font-mono text-[0.8125rem] text-white placeholder:text-zinc-600 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {currentTab !== 'network' && (
            <button
              onClick={() => {
                triggerHaptic('light');
                setIsAddModalOpen(true);
              }}
              className="h-[3rem] px-5 rounded-full bg-white text-black font-mono text-[0.8125rem] font-bold hover:bg-zinc-200 transition-all flex items-center gap-1.5 flex-shrink-0"
            >
              <span className="text-sm font-black">+</span>
              IMPORT
            </button>
          )}

          <button
            onClick={() => {
              triggerHaptic('light');
              onOpenSettings?.();
            }}
            className="w-[3rem] h-[3rem] rounded-full bg-nothing-surface1 border border-nothing-border hover:border-white text-zinc-400 hover:text-white flex items-center justify-center transition-all flex-shrink-0"
            title="Settings"
          >
            <DotSettingsIcon size={20} />
          </button>
        </div>
      </div>

      {/* Route to Network Tab View if Network is active */}
      {currentTab === 'network' ? (
        <NetworkStreamView />
      ) : (isAndroidBridgeAvailable && !hasAndroidPermission && (currentTab === 'videos' || currentTab === 'folders')) ||
          (!isAndroidBridgeAvailable && isLibraryEmpty && !isLoading && currentTab === 'videos' && !searchQuery) ? (
        /* FIRST-RUN / PERMISSION / EMPTY VIDEOS STATE: SHOW WELCOME ONBOARDING */
        <WelcomeOnboarding
          onRequestPermission={requestDevicePermission}
          isAndroidBridge={isAndroidBridgeAvailable}
          onAddFiles={handleDirectAddFiles}
          onPickFolder={handleDirectPickFolder}
          folderSupported={isFolderSupported}
        />
      ) : (
        <>
          {/* Continue Watching Hero Banner (only on Videos tab, when not searching, and ONLY if something to resume!) */}
          {currentTab === 'videos' && !searchQuery && !activeFolder && continueWatchingItem && (
            <div className="w-full flex-shrink-0 mb-4 z-10 relative">
              <ContinueWatchingHero item={continueWatchingItem} onPlay={playMedia} />
            </div>
          )}

          {/* Filter & Sort Chips Bar: single line (nowrap), horizontally scrollable with fade edge */}
          {currentTab === 'videos' && (
            <div className="relative flex items-center justify-between mb-3 py-1">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap pr-6 py-0.5 max-w-[80vw] sm:max-w-none">
                {/* ALL / RECENT Filter Chips */}
                <button
                  onClick={() => {
                    triggerHaptic('tick');
                    setVideoFilter('all');
                  }}
                  className={`px-3 py-1.5 rounded-full font-mono text-[0.8125rem] font-semibold transition-all flex-shrink-0 ${
                    videoFilter === 'all'
                      ? 'bg-nothing-text text-nothing-bg'
                      : 'bg-nothing-surface1 text-nothing-textMuted hover:text-nothing-text border border-nothing-border'
                  }`}
                >
                  ALL
                </button>
                <button
                  onClick={() => {
                    triggerHaptic('tick');
                    setVideoFilter('recent');
                  }}
                  className={`px-3 py-1.5 rounded-full font-mono text-[0.8125rem] font-semibold transition-all flex-shrink-0 ${
                    videoFilter === 'recent'
                      ? 'bg-nothing-text text-nothing-bg'
                      : 'bg-nothing-surface1 text-nothing-textMuted hover:text-nothing-text border border-nothing-border'
                  }`}
                >
                  RECENT
                </button>

                <span className="w-px h-4 bg-zinc-800 mx-1 flex-shrink-0" />

                {/* Sort Chips: Single line, arrow flips on re-tap, never wrap */}
                {(['date', 'name', 'duration', 'size', 'folder'] as const).map((s) => {
                  const isActive = sortBy === s;
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        triggerHaptic('tick');
                        if (isActive) {
                          toggleSortOrder();
                        } else {
                          setSortBy(s);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full font-mono text-[0.8125rem] uppercase transition-all flex-shrink-0 flex items-center gap-1 ${
                        isActive
                          ? 'bg-zinc-800 text-white border border-zinc-600'
                          : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                      }`}
                    >
                      <span>{s}</span>
                      {isActive && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                  );
                })}

                {/* Date Categorization Toggle */}
                {sortBy === 'date' && (
                  <button
                    onClick={() => {
                      triggerHaptic('tick');
                      setGroupByDate(!groupByDate);
                    }}
                    className={`px-3 py-1.5 rounded-full font-mono text-[0.8125rem] transition-all flex-shrink-0 flex items-center gap-1 ${
                      groupByDate
                        ? 'bg-nothing-red/20 text-nothing-red border border-nothing-red/60 shadow-[0_0_8px_rgba(215,25,33,0.25)]'
                        : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                    }`}
                    title="Toggle Date Category Grouping"
                  >
                    <span>{groupByDate ? 'BY DATE ✓' : 'FLAT LIST'}</span>
                  </button>
                )}
              </div>

              {/* View Toggle (List vs 2-Column Grid) and Rescan button */}
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    rescanDirectories();
                  }}
                  disabled={isScanning}
                  className="w-[2.25rem] h-[2.25rem] rounded-full border border-zinc-800 bg-nothing-surface1 hover:border-white text-zinc-400 hover:text-white flex items-center justify-center transition-all"
                  title="Rescan Folders"
                >
                  <DotRescanIcon size={16} />
                </button>

                <button
                  onClick={() => {
                    triggerHaptic('tick');
                    setViewMode(viewMode === 'list' ? 'grid' : 'list');
                  }}
                  className="w-[2.25rem] h-[2.25rem] rounded-full border border-zinc-800 bg-nothing-surface1 hover:border-white text-white flex items-center justify-center transition-all"
                  title="Toggle List / 2-Column Grid"
                >
                  {viewMode === 'list' ? <DotGridIcon size={16} /> : <DotListIcon size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Multi-Select Floating Bar */}
          {isMultiSelect && selectedIds.length > 0 && (
            <div className="sticky top-2 z-30 mb-3.5 p-3 rounded-2xl bg-zinc-900 border border-nothing-red flex items-center justify-between shadow-2xl backdrop-blur-md">
              <span className="font-mono text-xs text-white">
                {selectedIds.length} SELECTED
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBatchPlay}
                  className="px-3.5 py-1.5 rounded-full bg-white text-black font-mono text-xs font-bold"
                >
                  PLAY ALL
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="px-3.5 py-1.5 rounded-full border border-zinc-700 text-nothing-red font-mono text-xs hover:border-nothing-red"
                >
                  DELETE
                </button>
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <DotMatrixSpinner size="lg" label="LOADING" />
            </div>
          ) : currentTab === 'folders' && !activeFolder ? (
            /* Folders Tab Grouping */
            Object.keys(foldersMap).length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-3xl border border-zinc-800 bg-nothing-surface1 flex items-center justify-center mb-3 text-zinc-500">
                  <DotFoldersTabIcon size={28} />
                </div>
                <DotMatrixText size="lg" color="muted" className="mb-2">
                  NO FOLDERS FOUND
                </DotMatrixText>
                <p className="font-mono text-[0.75rem] text-zinc-500 max-w-xs mb-5">
                  {isAndroidBridgeAvailable
                    ? 'Videos on your phone storage will be listed here grouped by folders.'
                    : 'Import a folder to organize videos by directories.'}
                </p>
                <button
                  onClick={() => {
                    if (isAndroidBridgeAvailable) {
                      if (!hasAndroidPermission) {
                        requestDevicePermission();
                      } else {
                        rescanDirectories();
                      }
                    } else {
                      handleDirectPickFolder();
                    }
                  }}
                  className="px-5 py-2.5 rounded-full bg-nothing-red text-white font-mono text-xs font-bold"
                >
                  {isAndroidBridgeAvailable
                    ? !hasAndroidPermission
                      ? 'GRANT PERMISSION'
                      : 'RESCAN STORAGE'
                    : 'ADD FOLDER'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {Object.keys(foldersMap).map((folderName) => (
                  <FolderCard
                    key={folderName}
                    folderName={folderName}
                    items={foldersMap[folderName]}
                    onOpenFolder={setActiveFolder}
                  />
                ))}
              </div>
            )
          ) : currentTab === 'favorites' && filteredItems.length === 0 ? (
            /* Empty Favorites State */
            <div className="py-20 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-3xl border border-zinc-800 bg-nothing-surface1 flex items-center justify-center mb-3 text-zinc-500">
                <DotFavoritesTabIcon size={28} />
              </div>
              <DotMatrixText size="lg" color="muted" className="mb-2">
                NO FAVORITES YET
              </DotMatrixText>
              <p className="font-mono text-[0.75rem] text-zinc-500 max-w-xs mb-5">
                Tap the heart on any video to bookmark it here for quick access.
              </p>
              <button
                onClick={() => setCurrentTab('videos')}
                className="px-5 py-2.5 rounded-full bg-zinc-900 border border-zinc-700 text-white font-mono text-xs font-bold"
              >
                BROWSE VIDEOS
              </button>
            </div>
          ) : currentTab === 'recent' && filteredItems.length === 0 ? (
            /* Empty Recent State */
            <div className="py-20 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-3xl border border-zinc-800 bg-nothing-surface1 flex items-center justify-center mb-3 text-zinc-500">
                <DotRecentIcon size={28} />
              </div>
              <DotMatrixText size="lg" color="muted" className="mb-2">
                NO RECENT VIDEOS
              </DotMatrixText>
              <p className="font-mono text-[0.75rem] text-zinc-500 max-w-xs mb-5">
                Videos you watch will appear here with your saved resume positions.
              </p>
              <button
                onClick={() => setCurrentTab('videos')}
                className="px-5 py-2.5 rounded-full bg-zinc-900 border border-zinc-700 text-white font-mono text-xs font-bold"
              >
                BROWSE VIDEOS
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            /* Empty Filter / Search State */
            <div className="py-20 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-3xl border border-zinc-800 bg-nothing-surface1 flex items-center justify-center mb-3 text-zinc-500">
                <DotVideosTabIcon size={28} />
              </div>
              <DotMatrixText size="lg" color="muted" className="mb-2">
                NO VIDEOS MATCH
              </DotMatrixText>
              <p className="font-mono text-[0.75rem] text-zinc-500 max-w-xs mb-5">
                {searchQuery ? 'Try clearing your search query.' : 'Add videos from your device storage.'}
              </p>
              <button
                onClick={() => {
                  if (searchQuery) setSearchQuery('');
                  else if (isAndroidBridgeAvailable) rescanDirectories();
                  else quickFileInputRef.current?.click();
                }}
                className="px-5 py-2.5 rounded-full bg-white text-black font-mono text-xs font-bold"
              >
                {searchQuery ? 'CLEAR SEARCH' : isAndroidBridgeAvailable ? 'RESCAN VIDEOS' : 'ADD VIDEOS'}
              </button>
            </div>
          ) : (
            /* Media Items List / 2-Column Grid (Categorized by Dates or Listed) */
            dateGroups && !activeFolder ? (
              <div className="flex flex-col gap-5">
                {dateGroups.map((group: { category: string; items: MediaItem[] }) => (
                  <div key={group.category} className="flex flex-col">
                    {/* Date Category Section Header */}
                    <div className="flex items-center gap-2 mb-2 px-1 relative z-0 py-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-nothing-red shadow-[0_0_6px_#D71921]" />
                      <span className="font-mono text-xs font-bold text-nothing-text tracking-widest uppercase">
                        {group.category}
                      </span>
                      <span className="font-mono text-[10px] text-nothing-textDim">
                        • {group.items.length} {group.items.length === 1 ? 'VIDEO' : 'VIDEOS'}
                      </span>
                      <div className="flex-1 h-px bg-nothing-border ml-2" />
                    </div>

                    <div
                      className={
                        viewMode === 'grid'
                          ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'
                          : 'flex flex-col gap-2'
                      }
                    >
                      {group.items.map((item: MediaItem) => (
                        <MediaCard
                          key={item.id}
                          item={item}
                          viewMode={viewMode}
                          isSelected={selectedIds.includes(item.id)}
                          isMultiSelect={isMultiSelect}
                          onSelect={() => toggleSelectId(item.id)}
                          onPlay={playMedia}
                          onAddToQueue={addToQueue}
                          onToggleFavorite={toggleFavorite}
                          onRemove={removeItem}
                          onRelink={(target) => {
                            setRelinkTargetItem(target);
                            relinkInputRef.current?.click();
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'
                    : 'flex flex-col gap-2'
                }
              >
                {filteredItems.map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    viewMode={viewMode}
                    isSelected={selectedIds.includes(item.id)}
                    isMultiSelect={isMultiSelect}
                    onSelect={() => toggleSelectId(item.id)}
                    onPlay={playMedia}
                    onAddToQueue={addToQueue}
                    onToggleFavorite={toggleFavorite}
                    onRemove={removeItem}
                    onRelink={(target) => {
                      setRelinkTargetItem(target);
                      relinkInputRef.current?.click();
                    }}
                  />
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* Add Media Import Modal */}
      <AddMediaModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddItems={addMediaItems}
        onScanDirectoryHandle={scanDirectoryHandle}
        onNavigateToNetwork={() => setCurrentTab('network')}
      />
    </div>
  );
};
