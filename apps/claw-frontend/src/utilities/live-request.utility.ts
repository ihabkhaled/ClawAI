import {
  LIVE_DISCORD_PRIVATE_ERROR_CODE,
  LIVE_EXPORT_FILENAME_PREFIX,
  LIVE_EXPORT_OPTIONS,
  LIVE_SECONDS_PER_MINUTE,
  LIVE_YOUTUBE_CHANNEL_EMBED_SEGMENT,
  LIVE_YOUTUBE_CHANNEL_URL,
  LIVE_RECORDED_TOO_LONG_ERROR_CODE,
  LIVE_YOUTUBE_HANDLE_ERROR_CODE,
  LIVE_YOUTUBE_WATCH_URL,
} from '@/constants/live.constants';
import {
  YOUTUBE_EMBED_ORIGIN,
  YOUTUBE_EMBED_PATH_PREFIX,
} from '@/constants/marketing-videos.constants';
import { LiveCapability, LiveFeedTab, LiveMode } from '@/enums/live.enum';
import type { LiveExportFormat } from '@/enums/live.enum';
import type { LiveSummaryEstimate, LiveUsage } from '@/types/live.types';

/** Query params for a cursor page: no cursor on the first page, never an empty `cursor=`. */
export function buildLiveCursorParams(cursor: string | null): Record<string, string> | undefined {
  return cursor === null || cursor === '' ? undefined : { cursor };
}

export function liveExportFilename(sessionId: string, format: LiveExportFormat): string {
  const option = LIVE_EXPORT_OPTIONS.find((entry) => entry.format === format);
  return `${LIVE_EXPORT_FILENAME_PREFIX}-${sessionId}.${option?.extension ?? 'txt'}`;
}

/** Whole minutes left, rounded down: never promise a minute the meter will not give. */
export function liveSecondsToWholeMinutes(seconds: number): number {
  return Math.max(0, Math.floor(seconds / LIVE_SECONDS_PER_MINUTE));
}

/** Free seconds still left this month (the server sends total and used, not the remainder). */
export function liveFreeSecondsLeft(usage: LiveUsage): number {
  return Math.max(0, usage.freeSecondsTotal - usage.freeSecondsUsed);
}

/**
 * Media epoch ms as a local wall-clock time, or, for a one-click summary (`origin` = its media
 * start), as the offset into the video (`4:05`, `1:02:09`).
 */
export function formatLiveClock(
  mediaAt: number,
  locale: string,
  origin: number | null = null,
): string {
  if (origin !== null) {
    return formatLiveOffset(mediaAt - origin);
  }
  try {
    return new Intl.DateTimeFormat(locale, { timeStyle: 'medium' }).format(mediaAt);
  } catch {
    return new Date(mediaAt).toISOString();
  }
}

export function formatLiveDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

/** The readable name of an API failure; the caller passes the translated fallback. */
export function liveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return fallback;
}

export function parseLiveMode(value: string): LiveMode | null {
  return Object.values(LiveMode).find((mode) => mode === value) ?? null;
}

export function parseLiveFeedTab(value: string): LiveFeedTab | null {
  return Object.values(LiveFeedTab).find((tab) => tab === value) ?? null;
}

/** The server's embed URL, only when it is a youtube-nocookie embed (the one host the CSP frames). */
export function safeYoutubeEmbedUrl(url: string | null): string | null {
  return url !== null && url.startsWith(`${YOUTUBE_EMBED_ORIGIN}${YOUTUBE_EMBED_PATH_PREFIX}`)
    ? url
    : null;
}

/**
 * The youtube.com page of an embed URL, for "Watch on YouTube" (a stream whose owner disabled
 * embedding still plays there). Null when the URL is not one of our nocookie embeds.
 */
export function youtubeWatchUrl(embedUrl: string | null): string | null {
  const safe = safeYoutubeEmbedUrl(embedUrl);
  if (safe === null) {
    return null;
  }
  const parsed = new URL(safe);
  const id = parsed.pathname.slice(YOUTUBE_EMBED_PATH_PREFIX.length);
  if (id === LIVE_YOUTUBE_CHANNEL_EMBED_SEGMENT) {
    const channel = parsed.searchParams.get('channel');
    return channel === null ? null : `${LIVE_YOUTUBE_CHANNEL_URL}${channel}/live`;
  }
  return id === '' ? null : `${LIVE_YOUTUBE_WATCH_URL}${id}`;
}

function hasLiveErrorCode(error: Error, code: string): boolean {
  return error.message.includes(code) || ('code' in error && error.code === code);
}

/** The message key for a failed link check: a YouTube @handle, a too-long recorded video and a Discord link get their own explanation. */
export function liveResolveErrorKey(error: Error): string {
  if (hasLiveErrorCode(error, LIVE_YOUTUBE_HANDLE_ERROR_CODE)) {
    return 'live.page.youtubeHandleError';
  }
  if (hasLiveErrorCode(error, LIVE_RECORDED_TOO_LONG_ERROR_CODE)) {
    return 'live.page.recordedTooLongError';
  }
  if (hasLiveErrorCode(error, LIVE_DISCORD_PRIVATE_ERROR_CODE)) {
    return 'live.platform.discordPrivate';
  }
  return 'live.page.resolveError';
}

/** Server-side analysis of a stream (HLS) needs the viewer's rights attestation; nothing else does. */
export function liveSourceNeedsAttestation(capability: LiveCapability): boolean {
  return capability === LiveCapability.AUDIO || capability === LiveCapability.AUDIO_VISION;
}

/** Share of the month's free seconds still left, 0..100, for the usage bar. */
export function liveFreePercentLeft(usage: LiveUsage): number {
  if (usage.freeSecondsTotal <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, (liveFreeSecondsLeft(usage) / usage.freeSecondsTotal) * 100));
}

/** An offset into a video as `m:ss` or `h:mm:ss` (never negative). */
export function formatLiveOffset(offsetMs: number): string {
  const total = Math.max(0, Math.floor(offsetMs / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return hours > 0
    ? `${String(hours)}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${String(minutes)}:${seconds}`;
}

/** What a one-click summary of a `durationSeconds` video uses against this month's allowance. */
export function liveSummaryEstimate(
  durationSeconds: number | null | undefined,
  usage: LiveUsage | null,
): LiveSummaryEstimate {
  const freeMinutesLeft = usage === null ? 0 : Math.floor(liveFreeSecondsLeft(usage) / 60);
  if (durationSeconds === null || durationSeconds === undefined || durationSeconds <= 0) {
    return { minutes: null, freeMinutesLeft, paidMinutes: 0 };
  }
  const minutes = Math.ceil(durationSeconds / 60);
  return { minutes, freeMinutesLeft, paidMinutes: Math.max(0, minutes - freeMinutesLeft) };
}
