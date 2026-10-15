import React, { useRef } from 'react';
import { DotMatrixText } from '../common/DotMatrixText';
import { DotVideosTabIcon, DotFoldersTabIcon } from '../common/DotIcons';
import { triggerHaptic } from '../../lib/haptics';

interface WelcomeOnboardingProps {
  onAddFiles?: (files: FileList | File[]) => void;
  onPickFolder?: () => void;
  onRequestPermission?: () => void;
  isAndroidBridge?: boolean;
  folderSupported?: boolean;
}

export const WelcomeOnboarding: React.FC<WelcomeOnboardingProps> = ({
  onAddFiles,
  onPickFolder,
  onRequestPermission,
  isAndroidBridge = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const hasDirectoryPicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  const hasWebkitDirectory = typeof HTMLInputElement !== 'undefined' && 'webkitdirectory' in HTMLInputElement.prototype;
  const isFolderSupported = hasDirectoryPicker || hasWebkitDirectory;

  const handleFolderClick = () => {
    triggerHaptic('medium');
    if (hasDirectoryPicker && onPickFolder) {
      onPickFolder();
    } else if (hasWebkitDirectory) {
      folderInputRef.current?.click();
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto select-none">
      {/* Nothing OS Icon / Glyph */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-nothing-surface1 border border-zinc-800 flex items-center justify-center shadow-2xl">
          <DotVideosTabIcon size={38} color="#FFFFFF" />
        </div>
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-nothing-red shadow-[0_0_10px_#D71921] animate-ping" />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-nothing-red shadow-[0_0_8px_#D71921]" />
      </div>

      <DotMatrixText size="3xl" weight="black" className="mb-2">
        MATRIX PLAYER
      </DotMatrixText>

      <span className="font-mono text-xs font-bold text-nothing-red uppercase tracking-widest mb-3">
        PHOTOS & VIDEOS ACCESS
      </span>

      <p className="font-mono text-[0.875rem] text-zinc-400 mb-8 max-w-md leading-relaxed">
        Allow Matrix Player access to photos and videos on your phone to automatically display all videos categorized by date and organized by device storage folders.
      </p>

      {/* Hidden File Inputs for fallback */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,audio/*,.mkv,.mp4,.mov,.webm,.mp3,.aac,.flac,.wav,.ogg,.m4a"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0 && onAddFiles) {
            onAddFiles(e.target.files);
          }
        }}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        {...({ webkitdirectory: '', directory: '' } as any)}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0 && onAddFiles) {
            onAddFiles(e.target.files);
          }
        }}
        className="hidden"
      />

      {/* Primary Action Button */}
      {isAndroidBridge || onRequestPermission ? (
        <div className="w-full flex flex-col gap-3 mb-4">
          <button
            onClick={() => {
              triggerHaptic('medium');
              if (onRequestPermission) {
                onRequestPermission();
              }
            }}
            className="w-full min-h-[3.5rem] py-3.5 px-6 rounded-2xl bg-white hover:bg-zinc-200 text-black font-mono text-[0.875rem] font-bold shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2.5"
          >
            <DotVideosTabIcon size={22} color="#000000" />
            <span>GRANT PERMISSION</span>
          </button>

          <span className="font-mono text-[0.6875rem] text-zinc-500">
            Files stay completely private on your device. No cloud uploads.
          </span>
        </div>
      ) : (
        <div className="w-full flex flex-col sm:flex-row gap-3.5 mb-4">
          <button
            onClick={() => {
              triggerHaptic('medium');
              fileInputRef.current?.click();
            }}
            className="flex-1 min-h-[3.25rem] py-3.5 px-5 rounded-2xl bg-white hover:bg-zinc-200 text-black font-mono text-[0.875rem] font-bold shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2.5"
          >
            <DotVideosTabIcon size={20} color="#000000" />
            <span>ADD VIDEOS</span>
          </button>

          <button
            onClick={handleFolderClick}
            disabled={!isFolderSupported}
            className={`flex-1 min-h-[3.25rem] py-3.5 px-5 rounded-2xl border font-mono text-[0.875rem] font-bold transition-all flex items-center justify-center gap-2.5 ${
              isFolderSupported
                ? 'border-nothing-red/80 bg-zinc-900/90 text-white hover:border-nothing-red active:scale-95 shadow-[0_0_16px_rgba(215,25,33,0.25)]'
                : 'border-zinc-800 bg-zinc-900/40 text-zinc-600 cursor-not-allowed'
            }`}
          >
            <DotFoldersTabIcon size={20} color={isFolderSupported ? '#D71921' : 'currentColor'} />
            <span>ADD FOLDER</span>
          </button>
        </div>
      )}
    </div>
  );
};
