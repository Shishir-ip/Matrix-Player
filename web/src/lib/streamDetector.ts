import { PlaybackEngineType } from '../types';

export interface SniffResult {
  engine: PlaybackEngineType;
  format: string;
  isLiveLikely: boolean;
  mimeType?: string;
}

/**
 * Detect stream engine based on URL extension and pattern
 */
export function detectEngineFromUrl(url: string): SniffResult {
  const cleanUrl = url.split('?')[0].toLowerCase();

  if (cleanUrl.endsWith('.m3u8')) {
    return { engine: 'hls', format: 'HLS (.m3u8)', isLiveLikely: true, mimeType: 'application/x-mpegURL' };
  }
  if (cleanUrl.endsWith('.mpd')) {
    return { engine: 'dash', format: 'DASH (.mpd)', isLiveLikely: false, mimeType: 'application/dash+xml' };
  }
  if (cleanUrl.endsWith('.ts') || cleanUrl.endsWith('.flv')) {
    return { engine: 'mpegts', format: cleanUrl.endsWith('.ts') ? 'MPEG-TS (.ts)' : 'FLV (.flv)', isLiveLikely: true };
  }
  if (cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.m4v')) {
    return { engine: 'native', format: 'MP4 Video', isLiveLikely: false, mimeType: 'video/mp4' };
  }
  if (cleanUrl.endsWith('.webm')) {
    return { engine: 'native', format: 'WebM Video', isLiveLikely: false, mimeType: 'video/webm' };
  }
  if (cleanUrl.endsWith('.mp3') || cleanUrl.endsWith('.aac') || cleanUrl.endsWith('.flac') || cleanUrl.endsWith('.ogg') || cleanUrl.endsWith('.wav')) {
    return { engine: 'native', format: 'Audio Stream', isLiveLikely: false, mimeType: 'audio/mpeg' };
  }

  // If no extension matches, check common streaming URL keywords
  if (url.includes('/hls/') || url.includes('playlist.m3u8') || url.includes('/live/')) {
    return { engine: 'hls', format: 'HLS Stream', isLiveLikely: true };
  }
  if (url.includes('/dash/') || url.includes('manifest.mpd')) {
    return { engine: 'dash', format: 'DASH Stream', isLiveLikely: false };
  }

  // Fallback to native HTML5
  return { engine: 'native', format: 'Direct Stream', isLiveLikely: false };
}

/**
 * Sniffs network content-type or first bytes via HEAD/GET request
 */
export async function sniffStreamContent(url: string, corsProxy?: string): Promise<SniffResult> {
  const preliminary = detectEngineFromUrl(url);
  const targetUrl = corsProxy ? `${corsProxy}${encodeURIComponent(url)}` : url;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(targetUrl, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'cors',
    });
    clearTimeout(timeout);

    const contentType = res.headers.get('content-type')?.toLowerCase() || '';

    if (contentType.includes('mpegurl') || contentType.includes('m3u8')) {
      return { engine: 'hls', format: 'HLS Stream', isLiveLikely: true, mimeType: contentType };
    }
    if (contentType.includes('dash') || contentType.includes('mpd')) {
      return { engine: 'dash', format: 'DASH Stream', isLiveLikely: false, mimeType: contentType };
    }
    if (contentType.includes('video/mp2t') || contentType.includes('flv')) {
      return { engine: 'mpegts', format: 'MPEG-TS / FLV Stream', isLiveLikely: true, mimeType: contentType };
    }
    if (contentType.includes('video/mp4') || contentType.includes('video/webm')) {
      return { engine: 'native', format: contentType.includes('webm') ? 'WebM Video' : 'MP4 Video', isLiveLikely: false, mimeType: contentType };
    }
  } catch {
    // If fetch failed or CORS blocked, keep the preliminary detection
  }

  return preliminary;
}

export interface ParsedM3uItem {
  id: string;
  name: string;
  url: string;
  group?: string;
  logo?: string;
}

/**
 * Parses IPTV M3U / M3U8 playlist file content
 */
export function parseM3uPlaylist(content: string): ParsedM3uItem[] {
  const lines = content.split('\n');
  const items: ParsedM3uItem[] = [];

  let currentTitle = 'Stream';
  let currentGroup = 'General';
  let currentLogo = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      // Extract group-title="..."
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      if (groupMatch) {
        currentGroup = groupMatch[1];
      }

      // Extract tvg-logo="..."
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      if (logoMatch) {
        currentLogo = logoMatch[1];
      }

      // Title is after the last comma
      const commaIndex = line.lastIndexOf(',');
      if (commaIndex !== -1) {
        currentTitle = line.substring(commaIndex + 1).trim();
      }
    } else if (!line.startsWith('#')) {
      // Stream URL
      if (line.startsWith('http://') || line.startsWith('https://')) {
        items.push({
          id: `m3u-${items.length}-${Date.now()}`,
          name: currentTitle,
          url: line,
          group: currentGroup,
          logo: currentLogo,
        });
      }
      currentTitle = 'Stream';
      currentGroup = 'General';
      currentLogo = '';
    }
  }

  return items;
}
