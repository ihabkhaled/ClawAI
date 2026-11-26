import { describe, expect, it } from 'vitest';

import { LIVE_CAPTION_TRANSLATION_WAIT_MS } from '@/constants/live.constants';
import { LiveStatusCode } from '@/enums/live.enum';
import type { LiveCaption } from '@/types/live.types';
import {
  isBehindLiveEdge,
  isWithinSeekable,
  latestRevealedCaption,
  liveMarkerPercent,
  resolveLiveDisplayStatus,
  revealLiveCaptions,
  revealLiveEvents,
} from '@/utilities/live-reveal.utility';

const T0 = 1_700_000_000_000;

function caption(
  segmentId: string,
  offsetMs: number,
  text: string,
  language: string | null = 'de',
): LiveCaption {
  return { segmentId, text, language, startAt: T0 + offsetMs, endAt: null, uncertain: false };
}

const CAPTIONS = [
  caption('a', 0, 'hello'),
  caption('b', 6000, 'world'),
  caption('c', 12_000, 'later'),
];

describe('revealLiveEvents', () => {
  it('reveals only events at or before playback, never future ones', () => {
    expect(revealLiveEvents(CAPTIONS, T0 + 6000).map((c) => c.segmentId)).toEqual(['a', 'b']);
  });

  it('freezes while paused: the same playbackAt reveals the same set however many events arrive', () => {
    const paused = T0 + 6000;
    const later = [...CAPTIONS, caption('d', 20_000, 'more')];
    expect(revealLiveEvents(later, paused)).toEqual(revealLiveEvents(CAPTIONS, paused));
  });

  it('hides events again after a seek back', () => {
    expect(revealLiveEvents(CAPTIONS, T0 + 12_000)).toHaveLength(3);
    expect(revealLiveEvents(CAPTIONS, T0 + 1000).map((c) => c.segmentId)).toEqual(['a']);
  });
});

describe('latestRevealedCaption', () => {
  it('shows the exact words when the speaker talks in the viewer language', () => {
    expect(latestRevealedCaption(CAPTIONS, {}, 'de-DE', T0 + 7000)).toEqual({
      text: 'world',
      translated: false,
      uncertain: false,
    });
  });

  it('shows the translation when the speaker talks in another language', () => {
    expect(latestRevealedCaption(CAPTIONS, { b: 'Welt' }, 'en', T0 + 7000)).toEqual({
      text: 'Welt',
      translated: true,
      uncertain: false,
    });
  });

  it('never shows the original first while its translation is on the way', () => {
    // b is pending and young: the overlay keeps the newest READABLE caption (a, after its wait).
    expect(latestRevealedCaption(CAPTIONS, {}, 'en', T0 + 7000)).toBeNull();
    expect(latestRevealedCaption(CAPTIONS, { a: 'hallo' }, 'en', T0 + 7000)?.text).toBe('hallo');
  });

  it('shows the original once the translation is overdue', () => {
    expect(
      latestRevealedCaption(CAPTIONS.slice(0, 1), {}, 'en', T0 + LIVE_CAPTION_TRANSLATION_WAIT_MS)
        ?.text,
    ).toBe('hello');
  });

  it('is null before the first caption is reached', () => {
    expect(latestRevealedCaption(CAPTIONS, {}, 'de', T0 - 1)).toBeNull();
  });
});

describe('revealLiveCaptions', () => {
  it('keeps order and puts every caption in the viewer language', () => {
    const lines = revealLiveCaptions(CAPTIONS, { a: 'hallo', b: 'Welt' }, 'en', T0 + 12_000);
    expect(lines.map((line) => line.text)).toEqual(['hallo', 'Welt']);
  });

  it('treats an unknown spoken language as needing a translation', () => {
    const unknown = [caption('x', 0, 'مرحبا', null)];
    expect(revealLiveCaptions(unknown, {}, 'ar', T0 + 1000)).toEqual([]);
    expect(revealLiveCaptions(unknown, { x: 'مرحبا' }, 'ar', T0 + 1000)[0]?.text).toBe('مرحبا');
  });

  it('matches base languages: ar-EG speech for an ar viewer is exact', () => {
    const egyptian = [caption('e', 0, 'ازيك', 'ar-EG')];
    expect(revealLiveCaptions(egyptian, {}, 'ar', T0)[0]?.text).toBe('ازيك');
  });
});

describe('timeline helpers', () => {
  const range = { fromAt: T0, toAt: T0 + 100_000 };

  it('positions markers inside the seekable window and clamps outside it', () => {
    expect(liveMarkerPercent(T0 + 50_000, range)).toBe(50);
    expect(liveMarkerPercent(T0 - 10_000, range)).toBe(0);
    expect(liveMarkerPercent(T0 + 200_000, range)).toBe(100);
  });

  it('allows a seek only inside the window', () => {
    expect(isWithinSeekable(T0 + 1, range)).toBe(true);
    expect(isWithinSeekable(T0 - 1, range)).toBe(false);
    expect(isWithinSeekable(T0, null)).toBe(false);
  });

  it('is behind live only beyond the threshold', () => {
    expect(isBehindLiveEdge(T0, T0 + 5000)).toBe(false);
    expect(isBehindLiveEdge(T0, T0 + 60_000)).toBe(true);
    expect(isBehindLiveEdge(T0, null)).toBe(false);
  });
});

describe('resolveLiveDisplayStatus', () => {
  it('shows PAUSED while paused unless the server reports a billing or end state', () => {
    expect(resolveLiveDisplayStatus(LiveStatusCode.ANALYZING, true, false)).toBe(
      LiveStatusCode.PAUSED,
    );
    expect(resolveLiveDisplayStatus(LiveStatusCode.CREDITS_REQUIRED, true, false)).toBe(
      LiveStatusCode.CREDITS_REQUIRED,
    );
  });

  it('is always UNSUPPORTED for a player-only source', () => {
    expect(resolveLiveDisplayStatus(LiveStatusCode.ANALYZING, false, true)).toBe(
      LiveStatusCode.UNSUPPORTED,
    );
  });
});
