import {
  LIVE_BEHIND_THRESHOLD_MS,
  LIVE_CAPTION_TRANSLATION_WAIT_MS,
  LIVE_LANGUAGE_SUBTAG_SEPARATOR,
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

/** `pt-BR` → `pt`, `AR` → `ar`. */
export function liveBaseLanguage(value: string): string {
  return value.trim().toLowerCase().split(LIVE_LANGUAGE_SUBTAG_SEPARATOR)[0] ?? '';
}

/**
 * The text a viewer reads for one caption, or null while it must stay hidden. Spoken in the viewer's
 * language: the exact words. Otherwise the translation; while it is on its way nothing is shown, and
 * only after `LIVE_CAPTION_TRANSLATION_WAIT_MS` without one does the original appear.
 */
export function captionDisplayText(
  caption: LiveCaption,
  translations: Readonly<Record<string, string>>,
  language: string,
  playbackAt: number,
): string | null {
  if (
    caption.language !== null &&
    liveBaseLanguage(caption.language) === liveBaseLanguage(language)
  ) {
    return caption.text;
  }
  const translated = translations[caption.segmentId];
  if (translated !== undefined) {
    return translated;
  }
  const age = playbackAt - (caption.endAt ?? caption.startAt);
  return age >= LIVE_CAPTION_TRANSLATION_WAIT_MS ? caption.text : null;
}

/** The captions the viewer has reached, each already in the text they should read. */
export function revealLiveCaptions(
  captions: readonly LiveCaption[],
  translations: Readonly<Record<string, string>>,
  language: string,
  playbackAt: number,
): LiveCaption[] {
  return revealLiveEvents(captions, playbackAt).flatMap((caption) => {
    const text = captionDisplayText(caption, translations, language, playbackAt);
    return text === null ? [] : [{ ...caption, text }];
  });
}

/** The newest readable caption for the overlay; `translated` when it is not the spoken text. */
export function latestRevealedCaption(
  captions: readonly LiveCaption[],
  translations: Readonly<Record<string, string>>,
  language: string,
  playbackAt: number,
): LiveRevealedCaption | null {
  const latest = revealLiveCaptions(captions, translations, language, playbackAt).at(-1);
  if (latest === undefined) {
    return null;
  }
  return {
    text: latest.text,
    translated: translations[latest.segmentId] === latest.text,
    uncertain: latest.uncertain,
  };
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
