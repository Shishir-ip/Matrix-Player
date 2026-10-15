import React, { useState, useEffect } from 'react';
import { useAdaptiveLayout } from './hooks/useAdaptiveLayout';
import { useTvNavigation } from './hooks/useTvNavigation';
import { useLibraryStore } from './store/useLibraryStore';
import { useSettingsStore } from './store/useSettingsStore';
import { usePlayerStore } from './store/usePlayerStore';
import { SplashScreen } from './screens/SplashScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PlayerScreen } from './screens/PlayerScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { PhoneBottomNav, TabletSideRail, TvSideNav } from './components/navigation/NavigationComponents';
import { PerformanceOverlay } from './components/common/PerformanceOverlay';

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { isPhone, isTablet, isTv } = useAdaptiveLayout();
  const { currentTab, setCurrentTab, loadLibrary } = useLibraryStore();
  const { theme } = useSettingsStore();
  const { currentMedia, isPiP, setIsPiP, setIsNativePiP } = usePlayerStore();

  // Listen to Android Picture-in-Picture mode transitions
  useEffect(() => {
    (window as any).onPictureInPictureChanged = (inPiP: boolean) => {
      setIsPiP(!!inPiP);
      setIsNativePiP(!!inPiP);
    };
    return () => {
      delete (window as any).onPictureInPictureChanged;
    };
  }, [setIsPiP, setIsNativePiP]);

  // Enable TV D-Pad Spatial Navigation when in TV layout
  useTvNavigation(isTv);

  // Load IndexedDB library items on startup
  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  // Step-by-step Android Back button navigation
  useEffect(() => {
    (window as any).handleAndroidBack = () => {
      // 1. Check Player modals
      const playerStore = usePlayerStore.getState();
      if (playerStore.isEqualizerOpen) {
        playerStore.setModal('equalizer', false);
        return true;
      }
      if (playerStore.isSubtitlesOpen) {
        playerStore.setModal('subtitles', false);
        return true;
      }
      if (playerStore.isQualityOpen) {
        playerStore.setModal('quality', false);
        return true;
      }
      if (playerStore.isStatsOpen) {
        playerStore.setModal('stats', false);
        return true;
      }
      if (playerStore.isQueueOpen) {
        playerStore.setModal('queue', false);
        return true;
      }
      if (playerStore.isSleepTimerOpen) {
        playerStore.setModal('sleep', false);
        return true;
      }
      if (playerStore.isABRepeatOpen) {
        playerStore.setModal('ab', false);
        return true;
      }

      // 2. Check full player screen
      if (playerStore.currentMedia && !playerStore.isMiniPlayer) {
        playerStore.closePlayer();
        return true;
      }

      // 3. Check mini player
      if (playerStore.isMiniPlayer) {
        playerStore.closePlayer();
        return true;
      }

      // 4. Check Settings screen
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return true;
      }

      // 5. Delegate to Home screen for sub-views (active folder, multi-select, search, add modal)
      if ((window as any).handleHomeBack && (window as any).handleHomeBack()) {
        return true;
      }

      // 6. If on a tab other than 'videos', return to 'videos' tab
      if (currentTab !== 'videos') {
        setCurrentTab('videos');
        return true;
      }

      // 7. Root home screen: return false to allow Android to exit / background
      return false;
    };

    return () => {
      delete (window as any).handleAndroidBack;
    };
  }, [isSettingsOpen, currentTab, setCurrentTab]);

  // In Picture-in-Picture mode, render exclusively the PlayerScreen with zero background app chrome
  if (isPiP && currentMedia) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-black overflow-hidden flex items-center justify-center select-none z-[99999]">
        <PlayerScreen />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[100dvh] flex flex-col overflow-hidden bg-nothing-bg text-nothing-text font-sans">
      {/* Splash Screen */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {/* Developer Live Performance Overlay */}
      <PerformanceOverlay />

      {/* Main App Layout */}
      <div className="flex-1 w-full h-full flex overflow-hidden">
        {/* Tablet Side Rail */}
        {isTablet && (
          <TabletSideRail
            currentTab={currentTab}
            onTabChange={(tab) => {
              setCurrentTab(tab);
              setIsSettingsOpen(false);
            }}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isSettingsActive={isSettingsOpen}
          />
        )}

        {/* TV 10-Foot Left Navigation */}
        {isTv && (
          <TvSideNav
            currentTab={currentTab}
            onTabChange={(tab) => {
              setCurrentTab(tab);
              setIsSettingsOpen(false);
            }}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isSettingsActive={isSettingsOpen}
          />
        )}

        {/* Center Content Body */}
        <main className="flex-1 h-full flex flex-col overflow-hidden relative">
          {isSettingsOpen ? (
            <SettingsScreen onClose={() => setIsSettingsOpen(false)} />
          ) : (
            <HomeScreen onOpenSettings={() => setIsSettingsOpen(true)} />
          )}
        </main>
      </div>

      {/* Phone Bottom Navigation (max 5 items, safe bottom padding) */}
      {isPhone && (
        <PhoneBottomNav
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            setIsSettingsOpen(false);
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isSettingsActive={isSettingsOpen}
        />
      )}

      {/* Video & Media Player Screen Layer */}
      <PlayerScreen />
    </div>
  );
}

export default App;
