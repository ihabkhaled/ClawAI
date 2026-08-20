import { describe, expect, it } from 'vitest';

import {
  computeUsagePercent,
  formatNullableLimit,
  formatTokenCount,
} from '@/utilities/plan-display.utility';

describe('formatTokenCount', () => {
  it('groups large numbers', () => {
    expect(formatTokenCount(100000)).toBe((100000).toLocaleString());
  });

  it('formats zero', () => {
    expect(formatTokenCount(0)).toBe((0).toLocaleString());
  });

  it('formats a single digit', () => {
    expect(formatTokenCount(5)).toBe('5');
  });
});

describe('formatNullableLimit', () => {
  it('returns the unlimited label when value is null', () => {
    expect(formatNullableLimit(null, 'Unlimited')).toBe('Unlimited');
  });

  it('returns the unlimited label for a field omitted by an older cached response', () => {
    expect(formatNullableLimit(undefined, 'Unlimited')).toBe('Unlimited');
  });

  it('returns grouped number when value is present', () => {
    expect(formatNullableLimit(2500, 'Unlimited')).toBe((2500).toLocaleString());
  });

  it('treats zero as a real limit, not unlimited', () => {
    expect(formatNullableLimit(0, 'Unlimited')).toBe((0).toLocaleString());
  });
});

describe('computeUsagePercent', () => {
  it('computes a mid-range percentage', () => {
    expect(computeUsagePercent(50, 100)).toBe(50);
  });

  it('rounds to the nearest integer', () => {
    expect(computeUsagePercent(1, 3)).toBe(33);
  });

  it('returns 0 when the daily limit is zero (unlimited)', () => {
    expect(computeUsagePercent(500, 0)).toBe(0);
  });

  it('returns 0 when the daily limit is negative', () => {
    expect(computeUsagePercent(500, -10)).toBe(0);
  });

  it('clamps to 100 when usage exceeds the limit', () => {
    expect(computeUsagePercent(200, 100)).toBe(100);
  });

  it('clamps to 0 when used is negative', () => {
    expect(computeUsagePercent(-5, 100)).toBe(0);
  });

  it('returns 0 when nothing is used', () => {
    expect(computeUsagePercent(0, 100)).toBe(0);
  });
});
