import { describe, expect, it } from 'vitest';

import { LiveStatusCode } from '@/enums/live.enum';
import type { LiveCaption } from '@/types/live.types';
import {
  isBehindLiveEdge,
  isWithinSeekable,
  latestRevealedCaption,
  liveMarkerPercent,
  resolveLiveDisplayStatus,
  revealLiveEvents,
} from '@/utilities/live-reveal.utility';

const T0 = 1_700_000_000_000;

function caption(segmentId: string, offsetMs: number, text: string): LiveCaption {
  return { segmentId, text, startAt: T0 + offsetMs, endAt: null, uncertain: false };
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
  it('returns the newest reached caption in the source language without a translation', () => {
    expect(latestRevealedCaption(CAPTIONS, {}, T0 + 7000)).toEqual({
      text: 'world',
      translated: false,
      uncertain: false,
    });
  });

  it('prefers the session-language translation when it exists', () => {
    expect(latestRevealedCaption(CAPTIONS, { b: 'Welt' }, T0 + 7000)).toEqual({
      text: 'Welt',
      translated: true,
      uncertain: false,
    });
  });

  it('is null before the first caption is reached', () => {
    expect(latestRevealedCaption(CAPTIONS, {}, T0 - 1)).toBeNull();
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
