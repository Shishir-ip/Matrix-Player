import { yieldToMain } from './performanceMonitor';

/**
 * Thumbnail generator for video files using HTML5 Canvas
 * Captures frame at ~10% of duration and computes dimensions
 * Limits concurrent captures to max 2 at a time to prevent UI stutter
 */

let activeCaptures = 0;
const captureQueue: Array<() => void> = [];

async function acquireCaptureSlot(): Promise<void> {
  if (activeCaptures < 2) {
    activeCaptures++;
    return;
  }
  return new Promise((resolve) => {
    captureQueue.push(() => {
      activeCaptures++;
      resolve();
    });
  });
}

function releaseCaptureSlot(): void {
  activeCaptures--;
  if (captureQueue.length > 0) {
    const next = captureQueue.shift();
    next?.();
  }
}

export async function generateVideoThumbnail(
  fileOrUrl: File | string
): Promise<{
  thumbnailUrl: string;
  duration: number;
  resolution: { width: number; height: number };
}> {
  await acquireCaptureSlot();
  await yieldToMain();

  try {
    return await new Promise((resolve) => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';

      let objectUrl: string | null = null;
      if (typeof fileOrUrl === 'string') {
        video.src = fileOrUrl;
      } else {
        objectUrl = URL.createObjectURL(fileOrUrl);
        video.src = objectUrl;
      }

      const cleanup = () => {
        video.removeAttribute('src');
        video.load();
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };

      // Timeout safety net
      const timeoutId = setTimeout(() => {
        cleanup();
        resolve({
          thumbnailUrl: createDotMatrixPlaceholder('VID'),
          duration: 0,
          resolution: { width: 1280, height: 720 },
        });
      }, 6000);

      video.onloadedmetadata = () => {
        const duration = video.duration || 0;
        const targetTime = duration > 0 ? Math.min(Math.max(duration * 0.1, 1), 30) : 0;
        video.currentTime = targetTime;
      };

      video.onseeked = () => {
        clearTimeout(timeoutId);
        try {
          const width = video.videoWidth || 640;
          const height = video.videoHeight || 360;

          // Target canvas size <= 320px wide
          const canvas = document.createElement('canvas');
          const scale = Math.min(320 / width, 1);
          canvas.width = Math.max(160, Math.round(width * scale));
          canvas.height = Math.max(90, Math.round(height * scale));

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Export compact JPEG format
            const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
            cleanup();
            resolve({
              thumbnailUrl: dataUrl,
              duration: video.duration || 0,
              resolution: { width, height },
            });
            return;
          }
        } catch {
          // Canvas security or format fallback
        }
        cleanup();
        resolve({
          thumbnailUrl: createDotMatrixPlaceholder('VID'),
          duration: video.duration || 0,
          resolution: { width: video.videoWidth || 1280, height: video.videoHeight || 720 },
        });
      };

      video.onerror = () => {
        clearTimeout(timeoutId);
        cleanup();
        resolve({
          thumbnailUrl: createDotMatrixPlaceholder('VID'),
          duration: 0,
          resolution: { width: 1280, height: 720 },
        });
      };
    });
  } finally {
    releaseCaptureSlot();
  }
}

/**
 * Generates a Nothing OS style dot-matrix placeholder canvas
 */
export function createDotMatrixPlaceholder(text = 'MATRIX'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Dark background
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dot matrix grid
  const dotSpacing = 14;
  const dotRadius = 1.2;
  ctx.fillStyle = '#222222';

  for (let x = dotSpacing / 2; x < canvas.width; x += dotSpacing) {
    for (let y = dotSpacing / 2; y < canvas.height; y += dotSpacing) {
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Centered red glyph dot and label
  ctx.fillStyle = '#d71921';
  ctx.beginPath();
  ctx.arc(canvas.width / 2 - 28, canvas.height / 2, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 13px "Space Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2 - 18, canvas.height / 2);

  return canvas.toDataURL('image/jpeg', 0.8);
}
