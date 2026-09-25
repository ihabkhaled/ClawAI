import { describe, expect, it } from 'vitest';

import { formatMediaClock } from '@/utilities/format-duration.utility';

describe('formatMediaClock', () => {
  it.each([
    [0, '00:00'],
    [5_000, '00:05'],
    [83_000, '01:23'],
    [3_723_000, '1:02:03'],
    [-10, '00:00'],
  ])('%d ms → %s', (ms, clock) => {
    expect(formatMediaClock(ms)).toBe(clock);
  });
});
