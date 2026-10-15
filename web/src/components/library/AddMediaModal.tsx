import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaItem } from '../../types';
import { generateVideoThumbnail } from '../../lib/thumbnail';
import { DotMatrixText } from '../common/DotMatrixText';
import { DotVideosTabIcon, DotFoldersTabIcon, DotNetworkTabIcon } from '../common/DotIcons';
import { triggerHaptic } from '../../lib/haptics';
import { yieldToMain } from '../../lib/performanceMonitor';

interface AddMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: MediaItem[]) => void;
  onScanDirectoryHandle?: (handle: any) => Promise<number>;
  onNavigateToNetwork?: () => void;
}

export const AddMediaModal: React.FC<AddMediaModalProps> = ({
  isOpen,
  onClose,
  onAddItems,
  onScanDirectoryHandle,
  onNavigateToNetwork,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; filename: string } | null>(null);

  if (!isOpen) return null;

  const hasDirectoryPicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  const hasWebkitDirectory = typeof HTMLInputElement !== 'undefined' && 'webkitdirectory' in HTMLInputElement.prototype;
  const isFolderPickerSupported = hasDirectoryPicker || hasWebkitDirectory;

  const processFiles = async (files: FileList | File[]) => {
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
        name.endsWith('.mp3') ||
        name.endsWith('.aac') ||
        name.endsWith('.flac') ||
        name.endsWith('.wav') ||
        name.endsWith('.ogg') ||
        name.endsWith('.m4a')
      );
    });

    if (fileArray.length === 0) {
      onClose();
      return;
    }

    setIsProcessing(true);
    triggerHaptic('medium');
    const newMediaItems: MediaItem[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setProgress({ current: i + 1, total: fileArray.length, filename: file.name });
      await yieldToMain();

      try {
        const objectUrl = URL.createObjectURL(file);
        const { thumbnailUrl, duration, resolution } = await generateVideoThumbnail(file);

        const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
        const isAudio = file.type.startsWith('audio/') || ['mp3', 'aac', 'flac', 'wav', 'ogg', 'm4a'].includes(ext);

        let folderName = 'Imports';
        if ((file as any).webkitRelativePath) {
          const parts = (file as any).webkitRelativePath.split('/');
          if (parts.length > 1) {
            folderName = parts[0];
          }
        }

        const item: MediaItem = {
          id: `local-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
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

        newMediaItems.push(item);
      } catch (err) {
        console.warn('Failed to process media file:', file.name, err);
      }
    }

    onAddItems(newMediaItems);
    setIsProcessing(false);
    setProgress(null);
    triggerHaptic('success');
    onClose();
  };

  const handlePickFolder = async () => {
    triggerHaptic('light');
    if ('showDirectoryPicker' in window && onScanDirectoryHandle) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        onClose();
        await onScanDirectoryHandle(dirHandle);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          folderInputRef.current?.click();
        }
      }
    } else {
      folderInputRef.current?.click();
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
        onClick={() => !isProcessing && onClose()}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-nothing-surface1 border-t sm:border border-nothing-border rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative select-none"
          style={{ paddingBottom: 'calc(1.5rem + var(--safe-bottom))' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-nothing-red shadow-[0_0_8px_#D71921]" />
              <DotMatrixText size="xl" weight="bold">
                IMPORT MEDIA
              </DotMatrixText>
            </div>
            {!isProcessing && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            )}
          </div>

          {/* Hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*,audio/*,.mkv,.mp4,.mov,.webm,.mp3,.aac,.flac,.wav,.ogg,.m4a"
            onChange={(e) => e.target.files && processFiles(e.target.files)}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            {...({ webkitdirectory: '', directory: '' } as any)}
            onChange={(e) => e.target.files && processFiles(e.target.files)}
            className="hidden"
          />

          {isProcessing && progress ? (
            <div className="py-8 flex flex-col items-center justify-center gap-4">
              <span className="font-doto text-base font-bold text-white tracking-widest">
                SCANNING {progress.current} / {progress.total}
              </span>
              {/* Dot-matrix style progress bar */}
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden relative">
                <div
                  className="h-full bg-nothing-red transition-all duration-150 shadow-[0_0_8px_#D71921]"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <span className="font-mono text-[0.6875rem] text-zinc-400 max-w-sm truncate text-center">
                {progress.filename}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Option 1: Add Videos */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-500 text-left transition-all active:scale-98"
              >
                <div className="w-12 h-12 rounded-xl bg-black border border-zinc-700 flex items-center justify-center text-white flex-shrink-0">
                  <DotVideosTabIcon size={24} />
                </div>
                <div>
                  <span className="font-sans font-bold text-white text-[0.9375rem] block">
                    ADD VIDEOS & AUDIO
                  </span>
                  <span className="font-mono text-[0.75rem] text-zinc-400">
                    Open Android system picker to select individual files
                  </span>
                </div>
              </button>

              {/* Option 2: Add Folder */}
              <button
                onClick={handlePickFolder}
                disabled={!isFolderPickerSupported}
                className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all active:scale-98 ${
                  isFolderPickerSupported
                    ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-500'
                    : 'bg-zinc-900/40 border-zinc-800/50 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-black border border-nothing-red/50 flex items-center justify-center text-nothing-red flex-shrink-0">
                  <DotFoldersTabIcon size={24} color={isFolderPickerSupported ? '#D71921' : '#666'} />
                </div>
                <div>
                  <span className="font-sans font-bold text-white text-[0.9375rem] block">
                    ADD FOLDER
                  </span>
                  <span className="font-mono text-[0.75rem] text-zinc-400">
                    {isFolderPickerSupported
                      ? 'Recursively scan a directory and group into Folders'
                      : 'Folder scanning not supported on this device; use ADD VIDEOS instead.'}
                  </span>
                </div>
              </button>

              {/* Option 3: Network Stream */}
              <button
                onClick={() => {
                  onClose();
                  onNavigateToNetwork?.();
                }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-500 text-left transition-all active:scale-98"
              >
                <div className="w-12 h-12 rounded-xl bg-black border border-zinc-700 flex items-center justify-center text-white flex-shrink-0">
                  <DotNetworkTabIcon size={24} />
                </div>
                <div>
                  <span className="font-sans font-bold text-white text-[0.9375rem] block">
                    NETWORK STREAM
                  </span>
                  <span className="font-mono text-[0.75rem] text-zinc-400">
                    Play live HLS (.m3u8), DASH (.mpd), IPTV playlist, or direct stream
                  </span>
                </div>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
