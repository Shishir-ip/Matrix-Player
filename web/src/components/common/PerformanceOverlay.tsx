import React, { useEffect, useState } from 'react';
import { performanceMonitor } from '../../lib/performanceMonitor';
import { useSettingsStore } from '../../store/useSettingsStore';

export const PerformanceOverlay: React.FC = () => {
  const showOverlay = useSettingsStore((s) => s.showPerformanceOverlay);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!showOverlay) return;
    const unsub = performanceMonitor.subscribe(() => {
      setTick((t) => t + 1);
    });
    return unsub;
  }, [showOverlay]);

  if (!showOverlay) return null;

  const fps = performanceMonitor.currentFps;
  const hz = performanceMonitor.detectedHz;
  const memory = performanceMonitor.jsHeapUsedMb;

  return (
    <div className="fixed top-3 right-3 z-50 pointer-events-none bg-black/90 border border-zinc-700/80 rounded-2xl px-3 py-2 font-mono text-[0.6875rem] text-white shadow-2xl backdrop-blur-md flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            fps >= hz - 5 ? 'bg-green-500' : fps >= 45 ? 'bg-yellow-500' : 'bg-nothing-red animate-pulse'
          }`}
        />
        <span className="font-bold text-white text-xs">{fps} FPS</span>
      </div>
      <div className="text-zinc-400">
        <span>{hz}Hz</span>
      </div>
      {memory !== null && (
        <div className="text-zinc-400">
          <span>{memory}MB</span>
        </div>
      )}
    </div>
  );
};
