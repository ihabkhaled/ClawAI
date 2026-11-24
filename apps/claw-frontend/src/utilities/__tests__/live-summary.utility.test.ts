import { describe, expect, it } from 'vitest';

import { LiveCapability } from '@/enums/live.enum';
import type { LiveUsage } from '@/types/live.types';
import {
  formatLiveClock,
  formatLiveOffset,
  liveSummaryEstimate,
} from '@/utilities/live-request.utility';
import { liveModalBadgeKey } from '@/utilities/live-session.utility';

const usage = (freeSecondsTotal: number, freeSecondsUsed: number) =>
  ({ freeSecondsTotal, freeSecondsUsed }) as LiveUsage;

describe('liveSummaryEstimate (the video length counts as Live minutes, free first)', () => {
  it('fits in the free minutes', () => {
    expect(liveSummaryEstimate(754, usage(1800, 0))).toEqual({
      minutes: 13,
      freeMinutesLeft: 30,
      paidMinutes: 0,
    });
  });

  it('names the minutes past the free allowance', () => {
    expect(liveSummaryEstimate(3600, usage(1800, 1500))).toEqual({
      minutes: 60,
      freeMinutesLeft: 5,
      paidMinutes: 55,
    });
  });

  it('says the length is unknown when the site hides it, and never invents paid minutes', () => {
    expect(liveSummaryEstimate(null, usage(1800, 0))).toEqual({
      minutes: null,
      freeMinutesLeft: 30,
      paidMinutes: 0,
    });
    expect(liveSummaryEstimate(undefined, null)).toEqual({
      minutes: null,
      freeMinutesLeft: 0,
      paidMinutes: 0,
    });
  });
});

describe('formatLiveOffset / formatLiveClock with a summary origin', () => {
  it.each([
    [0, '0:00'],
    [65_400, '1:05'],
    [3_729_000, '1:02:09'],
    [-5_000, '0:00'],
  ])('%i ms → %s', (offset, text) => {
    expect(formatLiveOffset(offset)).toBe(text);
  });

  it('shows the offset into the video when an origin is given', () => {
    expect(formatLiveClock(1_000_245_000, 'en', 1_000_000_000)).toBe('4:05');
  });
});

describe('liveModalBadgeKey', () => {
  it('reads LIVE for a stream, Video for a recorded video and Summary for a one-click summary', () => {
    expect(liveModalBadgeKey({ capability: LiveCapability.SERVER_PULL })).toBe(
      'live.modal.liveBadge',
    );
    expect(liveModalBadgeKey({ capability: LiveCapability.RECORDED })).toBe(
      'live.modal.videoBadge',
    );
    expect(liveModalBadgeKey({ capability: LiveCapability.RECORDED, summary: true })).toBe(
      'live.summary.badge',
    );
  });
});
