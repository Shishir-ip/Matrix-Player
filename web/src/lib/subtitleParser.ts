export interface Cue {
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

/**
 * Converts timestamp string "00:01:23.456" or "00:01:23,456" into seconds
 */
function parseTimestamp(ts: string): number {
  const parts = ts.trim().replace(',', '.').split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }
  return 0;
}

/**
 * Parses SRT or WebVTT content into an array of cues
 */
export function parseSubtitles(content: string): Cue[] {
  const clean = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = clean.split('\n\n');
  const cues: Cue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    let timeLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIndex = i;
        break;
      }
    }

    if (timeLineIndex === -1) continue;

    const timeLine = lines[timeLineIndex];
    const timeParts = timeLine.split('-->');
    if (timeParts.length !== 2) continue;

    const start = parseTimestamp(timeParts[0]);
    // Strip WebVTT positioning params e.g. "00:00:10.000 line:80%"
    const endRaw = timeParts[1].trim().split(' ')[0];
    const end = parseTimestamp(endRaw);

    const textLines = lines.slice(timeLineIndex + 1);
    const rawText = textLines.join('\n');
    // Strip HTML/formatting tags like <i>, <b>, <font>
    const text = rawText.replace(/<[^>]*>/g, '').trim();

    if (text && end > start) {
      cues.push({ start, end, text });
    }
  }

  return cues;
}

/**
 * Find active cue for current playback time given an offset
 */
export function getActiveCue(cues: Cue[], currentTime: number, offsetMs = 0): string | null {
  const adjustedTime = currentTime - offsetMs / 1000;
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (adjustedTime >= cue.start && adjustedTime <= cue.end) {
      return cue.text;
    }
  }
  return null;
}
