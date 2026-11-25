import { resolve, sep } from 'node:path';

import {
  YTDLP_LIVE_EXTRACTOR_PATTERN,
  YTDLP_MISSING_FIELD,
} from '../constants/recorded-video.constants';
import { YTDLP_VIDEO_ID_PATTERN } from '../constants/server-pull.constants';
import type { RecordedProbe } from '../types/server-pull.types';

/**
 * Parses the probe's `<is_live> <duration> <id>` line. Null for a live video (server pull owns
 * those) or an unreadable line; the duration is null when the site does not report it.
 */
export function parseRecordedProbeLine(output: string): RecordedProbe | null {
  const line = output.trim().split('\n')[0] ?? '';
  const [isLive, duration, id, extractor = '', width, height] = line.split(' ', 6);
  if (isLive === undefined || duration === undefined || isLive === 'True') return null;
  if (duration === YTDLP_MISSING_FIELD && YTDLP_LIVE_EXTRACTOR_PATTERN.test(extractor)) return null;
  const seconds = duration === YTDLP_MISSING_FIELD ? null : Number(duration);
  if (seconds !== null && (!Number.isFinite(seconds) || seconds <= 0)) return null;
  return {
    durationSeconds: seconds === null ? null : Math.ceil(seconds),
    videoId: id !== undefined && YTDLP_VIDEO_ID_PATTERN.test(id) ? id : null,
    portrait: frameIsPortrait(width, height),
  };
}

/** Taller than wide when yt-dlp reports both sides; null when either is missing. */
function frameIsPortrait(width: string | undefined, height: string | undefined): boolean | null {
  const w = Number(width);
  const h = Number(height);
  return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 ? h > w : null;
}

/** The downloaded file yt-dlp printed, only when it really lies inside the run's directory. */
export function recordedFilePath(output: string, directory: string): string | null {
  const printed = output.trim().split('\n').at(-1)?.trim() ?? '';
  if (printed === '') return null;
  const file = resolve(printed);
  return file.startsWith(`${resolve(directory)}${sep}`) ? file : null;
}
