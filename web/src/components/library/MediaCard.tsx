import React from 'react';
import { MediaItem } from '../../types';
import { DotPlayIcon, DotHeartIcon } from '../common/DotIcons';
import { triggerHaptic } from '../../lib/haptics';

interface MediaCardProps {
  item: MediaItem;
  viewMode: 'list' | 'grid';
  isSelected?: boolean;
  isMultiSelect?: boolean;
  onSelect?: () => void;
  onPlay: (item: MediaItem) => void;
  onAddToQueue: (item: MediaItem) => void;
  onToggleFavorite: (id: string) => void;
  onRemove: (id: string) => void;
  onRelink?: (item: MediaItem) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  viewMode,
  isSelected = false,
  isMultiSelect = false,
  onSelect,
  onPlay,
  onAddToQueue,
  onToggleFavorite,
  onRemove,
  onRelink,
}) => {
  const formatDuration = (seconds: number): string => {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const formatSize = (bytes?: number): string => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    if (mb < 1000) return `${Math.round(mb)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const progressPercent = item.duration && item.currentTime
    ? Math.min(100, Math.round((item.currentTime / item.duration) * 100))
    : 0;

  // Phone default: compact list row (16:9 thumbnail ~128px wide on the left)
  if (viewMode === 'list') {
    return (
      <div
        onClick={() => {
          if (isMultiSelect) {
            onSelect?.();
          } else if (item.isRelinkNeeded) {
            onRelink?.(item);
          } else {
            triggerHaptic('light');
            onPlay(item);
          }
        }}
        className={`relative flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer group min-h-[4.5rem] ${
          isSelected
            ? 'border-nothing-red bg-nothing-surface2 ring-1 ring-nothing-red'
            : 'border-nothing-border bg-nothing-surface1 hover:border-nothing-borderHover hover:bg-nothing-surface2'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Multi-select checkbox */}
          {isMultiSelect && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.();
              }}
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors flex-shrink-0 ${
                isSelected ? 'bg-nothing-red border-nothing-red' : 'border-zinc-600 bg-zinc-900'
              }`}
            >
              {isSelected && <span className="text-white text-xs font-bold">✓</span>}
            </div>
          )}

          {/* 16:9 Thumbnail ~128px (w-32) wide on the left */}
          <div className="relative w-32 aspect-video rounded-xl overflow-hidden bg-black flex-shrink-0 border border-zinc-800">
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                <span className="font-doto text-zinc-600 text-xs">VIDEO</span>
              </div>
            )}

            {/* Duration badge */}
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 font-doto text-[0.625rem] text-white">
              {formatDuration(item.duration)}
            </div>

            {/* Thin red resume progress bar under thumbnail */}
            {progressPercent > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                <div
                  className="h-full bg-nothing-red shadow-[0_0_4px_#D71921]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>

          {/* Title up to 2 lines with ellipsis, size and resolution in small mono text */}
          <div className="flex flex-col min-w-0 flex-1 py-0.5">
            <span className="font-sans text-[0.875rem] font-semibold text-nothing-text line-clamp-2 leading-snug group-hover:opacity-85">
              {item.title}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[0.6875rem] text-nothing-textDim mt-1">
              <span className="uppercase text-nothing-textMuted font-semibold">{item.format || 'MP4'}</span>
              {item.resolution && item.resolution.height > 0 && (
                <span>• {item.resolution.height}p</span>
              )}
              {item.size && <span>• {formatSize(item.size)}</span>}
              {item.isRelinkNeeded && (
                <span className="text-nothing-red font-bold">RELINK NEEDED</span>
              )}
            </div>
          </div>
        </div>

        {/* Action icons (No emojis!) */}
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              triggerHaptic('tick');
              onToggleFavorite(item.id);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-nothing-red transition-colors"
            title="Favorite"
          >
            <DotHeartIcon size={16} filled={item.isFavorite} />
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              onAddToQueue(item);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs text-zinc-500 hover:text-white transition-colors"
            title="Add to queue"
          >
            +Q
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              onRemove(item.id);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-white transition-colors text-xs"
            title="Remove item"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // 2-Column Grid View
  return (
    <div
      onClick={() => {
        if (isMultiSelect) {
          onSelect?.();
        } else if (item.isRelinkNeeded) {
          onRelink?.(item);
        } else {
          triggerHaptic('light');
          onPlay(item);
        }
      }}
      className={`group relative flex flex-col rounded-2xl overflow-hidden border transition-all cursor-pointer ${
        isSelected
          ? 'border-nothing-red bg-nothing-surface2 ring-1 ring-nothing-red'
          : 'border-nothing-border bg-nothing-surface1 hover:border-nothing-borderHover hover:bg-nothing-surface2'
      }`}
    >
      {/* 16:9 Thumbnail container */}
      <div className="relative aspect-video w-full bg-black overflow-hidden">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
            <span className="font-doto text-zinc-600 text-xs">VIDEO</span>
          </div>
        )}

        {/* Duration badge */}
        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-black/85 font-doto text-[0.625rem] text-white">
          {formatDuration(item.duration)}
        </div>

        {/* Thin red resume bar */}
        {progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
            <div
              className="h-full bg-nothing-red shadow-[0_0_4px_#D71921]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Format badge */}
        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/85 font-mono text-[0.625rem] text-zinc-300 uppercase">
          {item.format || 'MP4'}
        </div>

        {/* Multi-select check in grid */}
        {isMultiSelect && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.();
            }}
            className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
              isSelected ? 'bg-nothing-red border-nothing-red' : 'border-zinc-500 bg-black/80'
            }`}
          >
            {isSelected && <span className="text-white text-xs font-bold">✓</span>}
          </div>
        )}
      </div>

      {/* Card Info Details */}
      <div className="p-3 flex flex-col justify-between flex-1">
        <div>
          <span className="font-sans font-semibold text-nothing-text text-[0.8125rem] line-clamp-2 leading-snug">
            {item.title}
          </span>
          <div className="flex items-center gap-1.5 font-mono text-[0.6875rem] text-nothing-textDim mt-1">
            {item.resolution && item.resolution.height > 0 && (
              <span>{item.resolution.height}p</span>
            )}
            {item.size && <span>• {formatSize(item.size)}</span>}
          </div>
        </div>

        {/* Bottom row actions (No emojis!) */}
        <div
          className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-zinc-800/80"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              triggerHaptic('tick');
              onToggleFavorite(item.id);
            }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:text-nothing-red transition-colors"
          >
            <DotHeartIcon size={14} filled={item.isFavorite} />
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onAddToQueue(item)}
              className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-600 font-mono text-[0.625rem] text-zinc-400 hover:text-white"
            >
              +Q
            </button>
            <button
              onClick={() => onRemove(item.id)}
              className="w-6 h-6 rounded-full text-zinc-500 hover:text-white flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
