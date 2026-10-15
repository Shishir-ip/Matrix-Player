import React from 'react';
import { ActiveTab } from '../../types';
import {
  DotVideosTabIcon,
  DotFoldersTabIcon,
  DotRecentIcon,
  DotNetworkTabIcon,
  DotFavoritesTabIcon,
  DotSettingsTabIcon,
} from '../common/DotIcons';
import { triggerHaptic } from '../../lib/haptics';

interface NavProps {
  currentTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
  isSettingsActive?: boolean;
}

const PHONE_TABS: { id: ActiveTab; label: string; IconComponent: React.FC<{ size?: number; color?: string; className?: string }> }[] = [
  { id: 'videos', label: 'VIDEOS', IconComponent: DotVideosTabIcon },
  { id: 'folders', label: 'FOLDERS', IconComponent: DotFoldersTabIcon },
  { id: 'network', label: 'NETWORK', IconComponent: DotNetworkTabIcon },
  { id: 'favorites', label: 'FAVORITES', IconComponent: DotFavoritesTabIcon },
  { id: 'settings', label: 'SETTINGS', IconComponent: DotSettingsTabIcon },
];

/**
 * Phone: Bottom Navigation with Thumb Reachability, max 5 destinations
 */
export const PhoneBottomNav: React.FC<NavProps> = ({
  currentTab,
  onTabChange,
  onOpenSettings,
  isSettingsActive = false,
}) => {
  return (
    <nav
      style={{
        height: 'var(--bottom-nav-height)',
        paddingBottom: 'var(--safe-bottom)',
      }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-nothing-surface1/95 backdrop-blur-lg border-t border-nothing-border px-2 flex items-center justify-around select-none"
    >
      {PHONE_TABS.map((tab) => {
        const isSettingsTab = tab.id === 'settings';
        const isActive = isSettingsTab ? isSettingsActive : (currentTab === tab.id && !isSettingsActive);
        const Icon = tab.IconComponent;

        return (
          <button
            key={tab.id}
            onClick={() => {
              triggerHaptic('tick');
              if (isSettingsTab) {
                onOpenSettings();
              } else {
                onTabChange(tab.id);
              }
            }}
            className={`flex flex-col items-center justify-center min-w-[3.5rem] min-h-[3rem] py-1 px-2 transition-all relative ${
              isActive ? 'text-nothing-text' : 'text-nothing-textDim hover:text-nothing-textMuted'
            }`}
          >
            {isActive && (
              <span className="absolute top-0.5 w-1.5 h-1.5 rounded-full bg-nothing-red shadow-[0_0_6px_#D71921]" />
            )}
            <div className="w-[1.625rem] h-[1.625rem] flex items-center justify-center">
              <Icon size={26} color={isActive ? 'var(--theme-text)' : 'currentColor'} />
            </div>
            <span
              className={`font-mono text-[0.75rem] tracking-wider uppercase mt-0.5 ${
                isActive ? 'text-nothing-text font-bold' : 'text-nothing-textDim'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

/**
 * Tablet: Collapsible Side Rail
 */
export const TabletSideRail: React.FC<NavProps> = ({
  currentTab,
  onTabChange,
  onOpenSettings,
  isSettingsActive = false,
}) => {
  return (
    <aside className="w-20 md:w-56 h-full flex-shrink-0 bg-nothing-surface1 border-r border-nothing-border flex flex-col justify-between p-3 select-none">
      <div className="flex flex-col gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-3 py-3">
          <span className="w-2.5 h-2.5 rounded-full bg-nothing-red shadow-[0_0_8px_#D71921]" />
          <span className="hidden md:inline font-doto font-black text-xl text-white tracking-widest">
            MATRIX
          </span>
        </div>

        {/* Tab Links */}
        <div className="flex flex-col gap-1.5">
          {PHONE_TABS.filter((t) => t.id !== 'settings').map((tab) => {
            const isActive = currentTab === tab.id && !isSettingsActive;
            const Icon = tab.IconComponent;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHaptic('tick');
                  onTabChange(tab.id);
                }}
                className={`flex items-center gap-3 px-3 py-3 rounded-2xl min-h-[3rem] transition-all ${
                  isActive
                    ? 'bg-zinc-900 border border-nothing-red/80 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                }`}
              >
                <Icon size={22} color={isActive ? '#FFFFFF' : 'currentColor'} />
                <span className="hidden md:inline font-mono text-[0.8125rem] font-semibold tracking-wider">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="hidden md:inline ml-auto w-1.5 h-1.5 rounded-full bg-nothing-red shadow-[0_0_6px_#D71921]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings Bottom Button */}
      <button
        onClick={() => {
          triggerHaptic('tick');
          onOpenSettings();
        }}
        className={`flex items-center gap-3 px-3 py-3 rounded-2xl min-h-[3rem] transition-all ${
          isSettingsActive
            ? 'bg-zinc-900 border border-nothing-red/80 text-white'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
        }`}
      >
        <DotSettingsTabIcon size={22} color={isSettingsActive ? '#FFFFFF' : 'currentColor'} />
        <span className="hidden md:inline font-mono text-[0.8125rem] font-semibold tracking-wider">
          SETTINGS
        </span>
      </button>
    </aside>
  );
};

/**
 * TV: 10-Foot UI Left Sidebar with D-pad Focusable items & Red Focus Ring
 */
export const TvSideNav: React.FC<NavProps> = ({
  currentTab,
  onTabChange,
  onOpenSettings,
  isSettingsActive = false,
}) => {
  return (
    <aside className="w-64 h-full flex-shrink-0 bg-black border-r border-nothing-border flex flex-col justify-between p-6 select-none pl-8 overscan-safe">
      <div className="flex flex-col gap-8">
        {/* TV Header with Logo & Red LED */}
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-nothing-red shadow-[0_0_12px_#D71921] animate-pulse" />
          <span className="font-doto font-black text-2xl text-white tracking-widest">
            MATRIX TV
          </span>
        </div>

        {/* TV Focusable Nav Items with Red Focus Ring */}
        <div className="flex flex-col gap-3">
          {PHONE_TABS.filter((t) => t.id !== 'settings').map((tab) => {
            const isActive = currentTab === tab.id && !isSettingsActive;
            const Icon = tab.IconComponent;
            return (
              <button
                key={tab.id}
                tabIndex={0}
                onClick={() => {
                  triggerHaptic('medium');
                  onTabChange(tab.id);
                }}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all text-left min-h-[3rem] focus:ring-2 focus:ring-nothing-red focus:bg-zinc-800 focus:outline-none ${
                  isActive
                    ? 'bg-zinc-900 border border-nothing-red text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                }`}
              >
                <Icon size={24} color={isActive ? '#FFFFFF' : 'currentColor'} />
                <span className="font-mono text-[0.875rem] font-bold tracking-wider">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-nothing-red shadow-[0_0_8px_#D71921]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TV Settings button */}
      <button
        tabIndex={0}
        onClick={() => {
          triggerHaptic('medium');
          onOpenSettings();
        }}
        className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all min-h-[3rem] focus:ring-2 focus:ring-nothing-red focus:bg-zinc-800 focus:outline-none ${
          isSettingsActive
            ? 'bg-zinc-900 border border-nothing-red text-white'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
        }`}
      >
        <DotSettingsTabIcon size={24} color={isSettingsActive ? '#FFFFFF' : 'currentColor'} />
        <span className="font-mono text-[0.875rem] font-bold tracking-wider">
          SETTINGS
        </span>
      </button>
    </aside>
  );
};
