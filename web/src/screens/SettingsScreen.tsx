import React, { useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { clearAllCache } from '../lib/db';
import { DotMatrixText } from '../components/common/DotMatrixText';
import { LayoutMode, AppTheme, UiSize } from '../types';
import { triggerHaptic } from '../lib/haptics';

export const SettingsScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const {
    layoutMode,
    setLayoutMode,
    theme,
    setTheme,
    uiSize,
    setUiSize,
    autoPerformanceMode,
    setAutoPerformanceMode,
    showPerformanceOverlay,
    setShowPerformanceOverlay,
    defaultSpeed,
    setDefaultSpeed,
    gesturesEnabled,
    setGesturesEnabled,
    gestureSensitivity,
    setGestureSensitivity,
    corsProxyUrl,
    setCorsProxyUrl,
    bufferSize,
    setBufferSize,
  } = useSettingsStore();

  const [cacheCleared, setCacheCleared] = useState(false);
  const [proxyInput, setProxyInput] = useState(corsProxyUrl);
  const [showFilePickerExplainer, setShowFilePickerExplainer] = useState(false);

  const handleClearCache = async () => {
    triggerHaptic('medium');
    await clearAllCache();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  };

  const handleSaveProxy = () => {
    triggerHaptic('light');
    setCorsProxyUrl(proxyInput.trim());
  };

  return (
    <div
      style={{
        paddingTop: 'calc(var(--safe-top) + 0.75rem)',
        paddingBottom: 'calc(var(--bottom-nav-height) + 1.5rem)',
      }}
      className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-8 overflow-y-auto select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-nothing-red shadow-[0_0_8px_#D71921]" />
          <DotMatrixText size="2xl" weight="bold">
            SETTINGS
          </DotMatrixText>
        </div>
        <button
          onClick={onClose}
          className="h-11 px-5 rounded-full bg-zinc-900 border border-zinc-700 hover:border-white font-mono text-[0.8125rem] text-white transition-all flex items-center justify-center"
        >
          DONE
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {/* 1. UI Sizing (Compact 0.9 / Default 1.0 / Large 1.15) */}
        <div className="rounded-3xl bg-nothing-surface1 border border-nothing-border p-5 md:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="font-sans font-bold text-[0.9375rem] text-white">UI SIZE</span>
            <span className="font-mono text-[0.75rem] text-nothing-red font-semibold uppercase">
              {uiSize.toUpperCase()}
            </span>
          </div>
          <p className="font-mono text-[0.75rem] text-zinc-400 mb-4">
            Scale fonts and touch targets across the app.
          </p>

          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: 'compact', label: 'COMPACT', scale: '0.9x' },
              { id: 'default', label: 'DEFAULT', scale: '1.0x' },
              { id: 'large', label: 'LARGE', scale: '1.15x' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  triggerHaptic('tick');
                  setUiSize(s.id as UiSize);
                }}
                className={`min-h-[3rem] p-3 rounded-2xl border text-center transition-all ${
                  uiSize === s.id
                    ? 'border-nothing-red bg-zinc-900 shadow-md text-white'
                    : 'border-zinc-800 bg-nothing-surface2 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <span className="font-mono text-[0.75rem] font-bold block">{s.label}</span>
                <span className="font-mono text-[0.625rem] text-zinc-500">{s.scale}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Layout Mode Switcher */}
        <div className="rounded-3xl bg-nothing-surface1 border border-nothing-border p-5 md:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="font-sans font-bold text-[0.9375rem] text-white">LAYOUT MODE</span>
            <span className="font-mono text-[0.75rem] text-nothing-red font-semibold uppercase">
              {layoutMode.toUpperCase()}
            </span>
          </div>
          <p className="font-mono text-[0.75rem] text-zinc-400 mb-4">
            Adaptive Phone, Tablet split view, or Android TV 10-foot remote UI.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(['auto', 'phone', 'tablet', 'tv'] as LayoutMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  triggerHaptic('tick');
                  setLayoutMode(mode);
                }}
                className={`min-h-[3rem] p-3 rounded-2xl border text-center transition-all ${
                  layoutMode === mode
                    ? 'border-nothing-red bg-zinc-900 shadow-md text-white'
                    : 'border-zinc-800 bg-nothing-surface2 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <span className="font-mono text-[0.75rem] font-bold uppercase block">
                  {mode}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Theme Display */}
        <div className="rounded-3xl bg-nothing-surface1 border border-nothing-border p-5 md:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="font-sans font-bold text-[0.9375rem] text-nothing-text block">
              THEME PALETTE
            </span>
            <span className="font-mono text-[0.75rem] text-nothing-red font-semibold uppercase">
              {theme.toUpperCase()}
            </span>
          </div>
          <p className="font-mono text-[0.75rem] text-nothing-textMuted mb-4">
            Grayish dark, pure OLED AMOLED black, or crisp high-contrast light.
          </p>

          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: 'dark', label: 'DARK', desc: 'Grayish Dark' },
              { id: 'amoled', label: 'AMOLED', desc: 'Deep Black' },
              { id: 'light', label: 'LIGHT', desc: 'Light Mode' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  triggerHaptic('tick');
                  setTheme(t.id as AppTheme);
                }}
                className={`min-h-[3.25rem] p-3 rounded-2xl border text-center transition-all ${
                  theme === t.id
                    ? 'border-nothing-red bg-nothing-surface3 text-nothing-text shadow-md'
                    : 'border-nothing-border bg-nothing-surface2 text-nothing-textDim hover:border-nothing-borderHover'
                }`}
              >
                <span className="font-mono text-[0.75rem] font-bold block">{t.label}</span>
                <span className="font-mono text-[0.625rem] opacity-75">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Touch Gestures */}
        <div className="rounded-3xl bg-nothing-surface1 border border-nothing-border p-5 md:p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-sans font-bold text-[0.9375rem] text-white block">
                PLAYER GESTURES
              </span>
              <span className="font-mono text-[0.75rem] text-zinc-400">
                Double tap +/-10s, vertical swipe brightness/volume, hold 2x speed.
              </span>
            </div>
            <button
              onClick={() => {
                triggerHaptic('tick');
                setGesturesEnabled(!gesturesEnabled);
              }}
              className={`w-12 h-7 rounded-full p-1 transition-colors flex-shrink-0 ${
                gesturesEnabled ? 'bg-nothing-red' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  gesturesEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 5. Developer & Performance */}
        <div className="rounded-3xl bg-nothing-surface1 border border-nothing-border p-5 md:p-6 shadow-xl">
          <span className="font-sans font-bold text-[0.9375rem] text-white block mb-1">
            DEVELOPER & PERFORMANCE
          </span>
          <p className="font-mono text-[0.75rem] text-zinc-400 mb-4">
            Real-time frame rate, refresh rate, and memory overlay for 60/90/120Hz display verification.
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[0.8125rem] text-white block">
                  PERFORMANCE OVERLAY
                </span>
                <span className="font-mono text-[0.6875rem] text-zinc-500">
                  Show live FPS, detected Hz, and memory heap in top corner
                </span>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('tick');
                  setShowPerformanceOverlay(!showPerformanceOverlay);
                }}
                className={`w-12 h-7 rounded-full p-1 transition-colors flex-shrink-0 ${
                  showPerformanceOverlay ? 'bg-nothing-red' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    showPerformanceOverlay ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <div>
                <span className="font-mono text-[0.8125rem] text-white block">
                  AUTO PERFORMANCE MODE
                </span>
                <span className="font-mono text-[0.6875rem] text-zinc-500">
                  Automatically reduce effects when frame rate drops on low-end hardware
                </span>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('tick');
                  setAutoPerformanceMode(!autoPerformanceMode);
                }}
                className={`w-12 h-7 rounded-full p-1 transition-colors flex-shrink-0 ${
                  autoPerformanceMode ? 'bg-nothing-red' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    autoPerformanceMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 6. CORS Proxy Relay */}
        <div className="rounded-3xl bg-nothing-surface1 border border-nothing-border p-5 md:p-6 shadow-xl">
          <span className="font-sans font-bold text-[0.9375rem] text-white block mb-1">
            CORS PROXY RELAY
          </span>
          <p className="font-mono text-[0.75rem] text-zinc-400 mb-3">
            If an external live stream blocks playback due to CORS headers, set a proxy URL prefix.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. https://corsproxy.io/?"
              value={proxyInput}
              onChange={(e) => setProxyInput(e.target.value)}
              className="flex-1 h-11 px-4 rounded-xl bg-black border border-zinc-700 font-mono text-[0.75rem] text-white placeholder:text-zinc-600 outline-none"
            />
            <button
              onClick={handleSaveProxy}
              className="h-11 px-4 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-white font-mono text-[0.75rem] text-white"
            >
              SAVE
            </button>
          </div>
        </div>

        {/* 7. Clear Cache */}
        <div className="rounded-3xl bg-nothing-surface1 border border-nothing-border p-5 md:p-6 shadow-xl flex items-center justify-between">
          <div>
            <span className="font-sans font-bold text-[0.9375rem] text-white block">
              STORAGE RESET
            </span>
            <span className="font-mono text-[0.75rem] text-zinc-400">
              Clear saved library, stream history, and thumbnails.
            </span>
          </div>
          <button
            onClick={handleClearCache}
            className="h-11 px-4 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-nothing-red text-zinc-300 hover:text-nothing-red font-mono text-[0.75rem] transition-colors"
          >
            {cacheCleared ? 'CLEARED ✓' : 'CLEAR CACHE'}
          </button>
        </div>

        {/* 8. About & "Why do I have to pick files?" Sheet */}
        <div className="rounded-3xl bg-nothing-surface1 border border-nothing-border p-5 md:p-6 shadow-xl font-mono text-[0.75rem] text-zinc-400">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-nothing-red" />
              <span className="font-doto text-base font-bold text-white tracking-widest">
                MATRIX PLAYER V1.1.0
              </span>
            </div>
            <button
              onClick={() => setShowFilePickerExplainer(!showFilePickerExplainer)}
              className="text-nothing-red underline font-mono text-[0.75rem]"
            >
              Why pick files?
            </button>
          </div>

          {showFilePickerExplainer && (
            <div className="mb-4 p-3.5 rounded-2xl bg-zinc-900 border border-zinc-700/80 text-zinc-300 leading-relaxed">
              <span className="font-bold text-white block mb-1">
                STORAGE PERMISSION NOTE:
              </span>
              Web browsers and sandboxed environments do not have OS-level background permissions to scan entire device disks automatically without user selection. By using <span className="text-white font-bold">ADD VIDEOS</span> or <span className="text-white font-bold">ADD FOLDER</span>, you grant direct access to play your media directly in memory without uploading anything to the cloud.
            </div>
          )}

          <p className="leading-relaxed">
            Engineered for high-frame-rate 60 / 90 / 120 / 144Hz video and media playback with the Nothing OS dot-matrix hardware aesthetic.
          </p>
        </div>
      </div>
    </div>
  );
};
