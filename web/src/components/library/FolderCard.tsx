import React from 'react';
import { MediaItem } from '../../types';
import { DotMatrixText } from '../common/DotMatrixText';
import { triggerHaptic } from '../../lib/haptics';

interface FolderCardProps {
  folderName: string;
  items: MediaItem[];
  onOpenFolder: (folderName: string) => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({ folderName, items, onOpenFolder }) => {
  const count = items.length;
  const firstThumbnail = items[0]?.thumbnailUrl;

  return (
    <div
      onClick={() => {
        triggerHaptic('light');
        onOpenFolder(folderName);
      }}
      className="group relative flex flex-col p-4 rounded-3xl bg-nothing-surface1 border border-nothing-border hover:border-zinc-500 hover:bg-[#141414] transition-all cursor-pointer overflow-hidden shadow-lg"
    >
      {/* Background Dot Grid */}
      <div className="absolute inset-0 bg-dot-grid bg-dots-sm opacity-15 pointer-events-none" />

      {/* Stacked Thumbnails Graphic */}
      <div className="relative h-28 w-full flex items-center justify-center my-2">
        {/* Back layered card */}
        <div className="absolute w-3/4 h-20 rounded-xl bg-zinc-900 border border-zinc-800 -rotate-6 translate-y-[-6px] opacity-60" />
        {/* Middle layered card */}
        <div className="absolute w-5/6 h-22 rounded-xl bg-zinc-800 border border-zinc-700 rotate-3 translate-y-[-2px] opacity-80" />
        {/* Top card */}
        <div className="relative w-full h-24 rounded-2xl bg-black border border-zinc-700 overflow-hidden shadow-md flex items-center justify-center">
          {firstThumbnail ? (
            <img src={firstThumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
              <span className="font-doto text-zinc-600 text-sm">FOLDER</span>
            </div>
          )}
          <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/85 font-mono text-[10px] text-white border border-zinc-700">
            {count} {count === 1 ? 'VIDEO' : 'VIDEOS'}
          </div>
        </div>
      </div>

      {/* Folder Name & Details */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-col truncate">
          <span className="font-sans font-bold text-white text-base truncate group-hover:text-zinc-200">
            {folderName}
          </span>
          <span className="font-mono text-xs text-zinc-500">
            {count} MEDIA ITEMS
          </span>
        </div>
        <div className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:border-white group-hover:text-white transition-all text-xs font-mono">
          →
        </div>
      </div>
    </div>
  );
};
