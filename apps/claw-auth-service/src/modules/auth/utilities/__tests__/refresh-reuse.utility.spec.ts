import { describe, expect, it } from 'vitest';

import { REFRESH_REUSE_GRACE_MS } from '../../constants/token-session.constants';
import { isWithinReuseGrace } from '../refresh-reuse.utility';

describe('isWithinReuseGrace', () => {
  const usedAt = new Date('2026-09-19T12:00:00.000Z');
  const at = (ms: number): Date => new Date(usedAt.getTime() + ms);

  it.each([
    [0, true],
    [REFRESH_REUSE_GRACE_MS, true],
    [REFRESH_REUSE_GRACE_MS + 1, false],
    [24 * 60 * 60 * 1000, false],
    // A clock that reads earlier than the recorded use is not a grace pass.
    [-1, false],
  ])('%i ms after use → %s', (elapsed, expected) => {
    expect(isWithinReuseGrace(usedAt, at(elapsed))).toBe(expected);
  });

  it('stays short: a stolen token has at most half a minute of overlap', () => {
    expect(REFRESH_REUSE_GRACE_MS).toBeLessThanOrEqual(60_000);
  });
});
