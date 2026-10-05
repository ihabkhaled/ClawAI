import { BadRequestException } from '@nestjs/common';

import { resolveUsageRange, utcDayStart } from '../usage-range.utility';
import { maskEmail, toCount, toTotals } from '../usage-row-mapper.utility';

describe('resolveUsageRange', () => {
  const NOW = new Date('2026-10-05T12:00:00.000Z');

  it('uses the last N hours and buckets hourly', () => {
    const range = resolveUsageRange({ hours: 6 }, NOW, 1);
    expect(range.from.toISOString()).toBe('2026-10-05T06:00:00.000Z');
    expect(range.to).toEqual(NOW);
    expect(range.grain).toBe('HOUR');
  });

  it('falls back to the default span when nothing is sent', () => {
    const range = resolveUsageRange({}, NOW, 30);
    expect(range.from.toISOString()).toBe('2026-09-05T12:00:00.000Z');
    expect(range.grain).toBe('DAY');
  });

  it('keeps exactly 7 days hourly and switches to daily beyond', () => {
    const week = resolveUsageRange({ from: '2026-09-28T12:00:00Z' }, NOW, 1);
    expect(week.grain).toBe('HOUR');
    const wider = resolveUsageRange({ from: '2026-09-28T11:00:00Z' }, NOW, 1);
    expect(wider.grain).toBe('DAY');
  });

  it('clamps a future `to` to now', () => {
    const range = resolveUsageRange(
      { from: '2026-10-05T00:00:00Z', to: '2027-01-01T00:00:00Z' },
      NOW,
      1,
    );
    expect(range.to).toEqual(NOW);
  });

  it('accepts exactly 90 days and rejects more', () => {
    expect(() => resolveUsageRange({ from: '2026-07-07T12:00:00Z' }, NOW, 1)).not.toThrow();
    expect(() => resolveUsageRange({ from: '2026-07-07T11:59:59Z' }, NOW, 1)).toThrow(
      BadRequestException,
    );
  });

  it('rejects an empty or inverted window', () => {
    expect(() =>
      resolveUsageRange({ from: '2026-10-05T10:00:00Z', to: '2026-10-05T09:00:00Z' }, NOW, 1),
    ).toThrow(BadRequestException);
  });

  it('finds the UTC day start', () => {
    expect(utcDayStart(NOW).toISOString()).toBe('2026-10-05T00:00:00.000Z');
  });
});

describe('usage row mapper', () => {
  it('maps a missing row to zero totals, cost stays a string', () => {
    expect(toTotals(undefined)).toEqual({
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      weightedTokens: 0,
      costMicroUsd: '0',
    });
  });

  it('converts bigint counts exactly', () => {
    expect(toCount(12n)).toBe(12);
    expect(toCount(null)).toBe(0);
  });

  it('masks emails without leaking the local part', () => {
    expect(maskEmail('jane.doe@example.com')).toBe('ja***@example.com');
    expect(maskEmail('a@example.com')).toBe('a***@example.com');
    expect(maskEmail('nonsense')).toBe('***');
  });
});
