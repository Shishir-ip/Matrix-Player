/**
 * Performance Monitor & Frame Rate Measurement
 * Detects 60 / 90 / 120 / 144 Hz display refresh rate
 * Provides live FPS, dropped frame tracking, and cooperative task slicing
 */

class PerformanceMonitorService {
  public detectedHz: number = 60;
  public currentFps: number = 60;
  public droppedFrames: number = 0;
  public jsHeapUsedMb: number | null = null;
  private isMeasuring: boolean = false;
  private subscribers: Set<() => void> = new Set();
  private lastFrameTimestamp: number = 0;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  constructor() {
    this.detectRefreshRate();
  }

  /**
   * Measure display refresh rate using consecutive rAF timestamps
   */
  public async detectRefreshRate(): Promise<number> {
    return new Promise((resolve) => {
      let frames = 0;
      let startTime = 0;
      const samples: number[] = [];

      const step = (time: number) => {
        if (!startTime) {
          startTime = time;
        } else {
          samples.push(time - samples[samples.length - 1] || time - startTime);
        }

        frames++;
        if (frames < 35) {
          requestAnimationFrame(step);
        } else {
          const totalDuration = time - startTime;
          const avgFps = (frames / totalDuration) * 1000;

          // Snap to standard refresh rates
          if (avgFps > 130) {
            this.detectedHz = 144;
          } else if (avgFps > 105) {
            this.detectedHz = 120;
          } else if (avgFps > 75) {
            this.detectedHz = 90;
          } else {
            this.detectedHz = 60;
          }

          resolve(this.detectedHz);
          this.startFpsLoop();
        }
      };

      requestAnimationFrame(step);
    });
  }

  private startFpsLoop() {
    if (this.isMeasuring) return;
    this.isMeasuring = true;

    let lastTime = performance.now();
    let frames = 0;

    const loop = (now: number) => {
      frames++;
      const delta = now - lastTime;

      // Update FPS readout every 500ms
      if (delta >= 500) {
        this.currentFps = Math.round((frames / delta) * 1000);
        frames = 0;
        lastTime = now;

        // Query memory if available in Chrome/Android WebView
        const perf = performance as any;
        if (perf.memory && perf.memory.usedJSHeapSize) {
          this.jsHeapUsedMb = Math.round(perf.memory.usedJSHeapSize / (1024 * 1024));
        }

        // Notify subscribers
        this.subscribers.forEach((fn) => fn());
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  public subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }
}

export const performanceMonitor = new PerformanceMonitorService();

/**
 * Slices long execution tasks into <=4ms chunks
 * uses scheduler.yield() when supported, with requestIdleCallback/setTimeout fallback
 */
export async function yieldToMain(deadlineMs = 4): Promise<void> {
  const scheduler = (window as any).scheduler;
  if (scheduler && typeof scheduler.yield === 'function') {
    return scheduler.yield();
  }
  return new Promise((resolve) => {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => resolve(), { timeout: deadlineMs });
    } else {
      setTimeout(resolve, 0);
    }
  });
}
