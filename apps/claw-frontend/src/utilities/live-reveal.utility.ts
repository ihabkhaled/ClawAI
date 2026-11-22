import {
  LIVE_BEHIND_THRESHOLD_MS,
  LIVE_PERCENT,
  LIVE_SERVER_DOMINANT_STATUSES,
} from '@/constants/live.constants';
import { LiveStatusCode } from '@/enums/live.enum';
import type { LiveCaption, LiveRevealedCaption, LiveSeekableRange } from '@/types/live.types';

/**
 * Only what the viewer has already reached: `startAt <= playbackAt`. Pausing freezes `playbackAt`,
 * so the visible feed freezes; seeking back lowers it, so later events disappear again (section 5).
 */
export function revealLiveEvents<T extends { startAt: number }>(
  items: readonly T[],
  playbackAt: number,
): T[] {
  return items.filter((item) => item.startAt <= playbackAt);
}

/** The newest caption the viewer has reached, in the session language when a translation exists. */
export function latestRevealedCaption(
  captions: readonly LiveCaption[],
  translations: Readonly<Record<string, string>>,
  playbackAt: number,
): LiveRevealedCaption | null {
  let latest: LiveCaption | null = null;
  for (const caption of captions) {
    if (caption.startAt <= playbackAt && (latest === null || caption.startAt >= latest.startAt)) {
      latest = caption;
    }
  }
  if (latest === null) {
    return null;
  }
  const translated = translations[latest.segmentId];
  return translated === undefined
    ? { text: latest.text, translated: false, uncertain: latest.uncertain }
    : { text: translated, translated: true, uncertain: latest.uncertain };
}

export function captionText(
  caption: LiveCaption,
  translations: Readonly<Record<string, string>>,
): string {
  return translations[caption.segmentId] ?? caption.text;
}

export function isWithinSeekable(mediaAt: number, range: LiveSeekableRange | null): boolean {
  return range !== null && mediaAt >= range.fromAt && mediaAt <= range.toAt;
}

/** Marker position on the timeline as a 0..100 percentage of the seekable window. */
export function liveMarkerPercent(mediaAt: number, range: LiveSeekableRange | null): number {
  if (range === null || range.toAt <= range.fromAt) {
    return LIVE_PERCENT;
  }
  const ratio = (mediaAt - range.fromAt) / (range.toAt - range.fromAt);
  return Math.min(LIVE_PERCENT, Math.max(0, ratio * LIVE_PERCENT));
}

export function isBehindLiveEdge(playbackAt: number, liveEdgeAt: number | null): boolean {
  return liveEdgeAt !== null && liveEdgeAt - playbackAt > LIVE_BEHIND_THRESHOLD_MS;
}

/**
 * The one status the banner shows. A YouTube source is always UNSUPPORTED; billing, capacity and
 * end states from the server win; otherwise a paused player reads as PAUSED.
 */
export function resolveLiveDisplayStatus(
  serverStatus: LiveStatusCode,
  isPaused: boolean,
  isPlayerOnly: boolean,
): LiveStatusCode {
  if (isPlayerOnly) {
    return LiveStatusCode.UNSUPPORTED;
  }
  if (LIVE_SERVER_DOMINANT_STATUSES.has(serverStatus)) {
    return serverStatus;
  }
  return isPaused ? LiveStatusCode.PAUSED : serverStatus;
}
