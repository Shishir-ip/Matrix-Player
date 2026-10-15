import { create } from 'zustand';
import { LayoutMode, AppTheme, UiSize } from '../types';

interface SettingsState {
  layoutMode: LayoutMode;
  theme: AppTheme;
  uiSize: UiSize;
  autoPerformanceMode: boolean;
  showPerformanceOverlay: boolean;
  defaultSpeed: number;
  gesturesEnabled: boolean;
  gestureSensitivity: number; // 1 to 5
  corsProxyUrl: string;
  bufferSize: 'normal' | 'large' | 'low-latency';
  subtitleSize: 'small' | 'medium' | 'large';
  subtitleColor: string;
  setLayoutMode: (mode: LayoutMode) => void;
  setTheme: (theme: AppTheme) => void;
  setUiSize: (size: UiSize) => void;
  setAutoPerformanceMode: (enabled: boolean) => void;
  setShowPerformanceOverlay: (show: boolean) => void;
  setDefaultSpeed: (speed: number) => void;
  setGesturesEnabled: (enabled: boolean) => void;
  setGestureSensitivity: (s: number) => void;
  setCorsProxyUrl: (url: string) => void;
  setBufferSize: (size: 'normal' | 'large' | 'low-latency') => void;
  setSubtitleSize: (size: 'small' | 'medium' | 'large') => void;
}

const getStored = <T>(key: string, def: T): T => {
  try {
    const val = localStorage.getItem(`matrix_${key}`);
    return val ? JSON.parse(val) : def;
  } catch {
    return def;
  }
};

const setStored = (key: string, val: any) => {
  try {
    localStorage.setItem(`matrix_${key}`, JSON.stringify(val));
  } catch {}
};

function applyUiScale(size: UiSize) {
  const scale = size === 'compact' ? 0.9 : size === 'large' ? 1.15 : 1.0;
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--ui-scale', String(scale));
  }
}

const initialUiSize = getStored<UiSize>('ui_size', 'default');
applyUiScale(initialUiSize);

function applyTheme(theme: AppTheme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#F4F4F6';
      document.body.style.color = '#0F0F12';
    } else {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = theme === 'amoled' ? '#000000' : '#161618';
      document.body.style.color = '#FFFFFF';
    }
  }
}

const initialTheme = getStored<AppTheme>('theme', 'dark');
applyTheme(initialTheme);

export const useSettingsStore = create<SettingsState>((set) => ({
  layoutMode: getStored<LayoutMode>('layout', 'auto'),
  theme: initialTheme,
  uiSize: initialUiSize,
  autoPerformanceMode: getStored<boolean>('auto_perf', true),
  showPerformanceOverlay: getStored<boolean>('show_perf_overlay', false),
  defaultSpeed: getStored<number>('speed', 1.0),
  gesturesEnabled: getStored<boolean>('gestures', true),
  gestureSensitivity: getStored<number>('sensitivity', 3),
  corsProxyUrl: getStored<string>('cors_proxy', ''),
  bufferSize: getStored<'normal' | 'large' | 'low-latency'>('buffer_size', 'normal'),
  subtitleSize: getStored<'small' | 'medium' | 'large'>('sub_size', 'medium'),
  subtitleColor: getStored<string>('sub_color', '#FFFFFF'),

  setLayoutMode: (mode) => {
    setStored('layout', mode);
    set({ layoutMode: mode });
  },
  setTheme: (theme) => {
    setStored('theme', theme);
    applyTheme(theme);
    set({ theme });
  },
  setUiSize: (size) => {
    setStored('ui_size', size);
    applyUiScale(size);
    set({ uiSize: size });
  },
  setAutoPerformanceMode: (enabled) => {
    setStored('auto_perf', enabled);
    set({ autoPerformanceMode: enabled });
  },
  setShowPerformanceOverlay: (show) => {
    setStored('show_perf_overlay', show);
    set({ showPerformanceOverlay: show });
  },
  setDefaultSpeed: (speed) => {
    setStored('speed', speed);
    set({ defaultSpeed: speed });
  },
  setGesturesEnabled: (enabled) => {
    setStored('gestures', enabled);
    set({ gesturesEnabled: enabled });
  },
  setGestureSensitivity: (s) => {
    setStored('sensitivity', s);
    set({ gestureSensitivity: s });
  },
  setCorsProxyUrl: (url) => {
    setStored('cors_proxy', url);
    set({ corsProxyUrl: url });
  },
  setBufferSize: (size) => {
    setStored('buffer_size', size);
    set({ bufferSize: size });
  },
  setSubtitleSize: (size) => {
    setStored('sub_size', size);
    set({ subtitleSize: size });
  },
}));
