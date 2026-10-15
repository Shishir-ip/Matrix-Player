import { useState, useEffect } from 'react';
import { LayoutMode, ActiveLayout } from '../types';
import { useSettingsStore } from '../store/useSettingsStore';

export function detectDeviceLayout(): ActiveLayout {
  if (typeof window === 'undefined') return 'phone';

  const ua = (navigator.userAgent || '').toLowerCase();
  const isTvUA =
    ua.includes('android tv') ||
    ua.includes('smart-tv') ||
    ua.includes('smarttv') ||
    ua.includes('googletv') ||
    ua.includes('aftt') || // Fire TV Stick
    ua.includes('bravia') ||
    ua.includes('apple tv') ||
    ua.includes('crkey') || // Chromecast
    ua.includes('leanback');

  if (isTvUA) {
    return 'tv';
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const minDim = Math.min(width, height);

  // Tablet threshold: min dimension >= 600px and landscape or large width
  if (minDim >= 600 || width >= 840) {
    // If it's a huge 1080p/4k screen with TV-like characteristics or no touch, can be TV or tablet
    if (width >= 1600 && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      // Large desktop / TV
      return width >= 1900 && isTvUA ? 'tv' : 'tablet';
    }
    return 'tablet';
  }

  return 'phone';
}

export function useAdaptiveLayout(): {
  layout: ActiveLayout;
  layoutMode: LayoutMode;
  isPhone: boolean;
  isTablet: boolean;
  isTv: boolean;
} {
  const layoutMode = useSettingsStore((s) => s.layoutMode);
  const [detected, setDetected] = useState<ActiveLayout>(detectDeviceLayout);

  useEffect(() => {
    const handleResize = () => {
      setDetected(detectDeviceLayout());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const layout: ActiveLayout = layoutMode === 'auto' ? detected : layoutMode;

  return {
    layout,
    layoutMode,
    isPhone: layout === 'phone',
    isTablet: layout === 'tablet',
    isTv: layout === 'tv',
  };
}
