import { describe, expect, it } from 'vitest';

import { UsageRangePreset } from '@/enums/usage-range-preset.enum';
import type { UsageRangeSelection } from '@/types/admin-usage-analytics.types';
import {
  barPercent,
  buildRangeQuery,
  formatBucketLabel,
  toolLabelKey,
  validateSelection,
} from '@/utilities/usage-analytics.utility';

const NOW = new Date('2026-10-05T12:30:00.000Z');

function selection(overrides: Partial<UsageRangeSelection> = {}): UsageRangeSelection {
  return { preset: UsageRangePreset.Today, hours: 24, customFrom: '', customTo: '', ...overrides };
}

describe('buildRangeQuery', () => {
  it('today starts at UTC midnight and leaves `to` to the server clock', () => {
    expect(buildRangeQuery(selection(), NOW)).toEqual({ from: '2026-10-05T00:00:00.000Z' });
  });

  it('hours and week use the hours form, never from/to', () => {
    expect(buildRangeQuery(selection({ preset: UsageRangePreset.Hours, hours: 6 }), NOW)).toEqual({
      hours: 6,
    });
    expect(buildRangeQuery(selection({ preset: UsageRangePreset.Week }), NOW)).toEqual({
      hours: 168,
    });
  });

  it('month is the rolling last 30 days', () => {
    expect(buildRangeQuery(selection({ preset: UsageRangePreset.Month }), NOW)).toEqual({
      from: '2026-09-05T12:30:00.000Z',
    });
  });

  it('a custom period includes the end date by closing at the next midnight', () => {
    const query = buildRangeQuery(
      selection({
        preset: UsageRangePreset.Custom,
        customFrom: '2026-10-01',
        customTo: '2026-10-03',
      }),
      NOW,
    );
    expect(query).toEqual({ from: '2026-10-01T00:00:00.000Z', to: '2026-10-04T00:00:00.000Z' });
  });
});

describe('validateSelection', () => {
  it('accepts presets with nothing to check', () => {
    expect(validateSelection(selection({ preset: UsageRangePreset.Month }))).toBeNull();
  });

  it('bounds the hours to 1..168 and whole numbers', () => {
    const hours = (value: number): UsageRangeSelection =>
      selection({ preset: UsageRangePreset.Hours, hours: value });
    expect(validateSelection(hours(168))).toBeNull();
    expect(validateSelection(hours(1))).toBeNull();
    expect(validateSelection(hours(0))).toBe('usageAnalytics.errorHours');
    expect(validateSelection(hours(169))).toBe('usageAnalytics.errorHours');
    expect(validateSelection(hours(1.5))).toBe('usageAnalytics.errorHours');
    expect(validateSelection(hours(Number.NaN))).toBe('usageAnalytics.errorHours');
  });

  it('checks a custom period: both dates, order, and the 90 day cap', () => {
    const custom = (customFrom: string, customTo: string): UsageRangeSelection =>
      selection({ preset: UsageRangePreset.Custom, customFrom, customTo });
    expect(validateSelection(custom('', '2026-10-03'))).toBe('usageAnalytics.errorRangeMissing');
    expect(validateSelection(custom('2026-10-04', '2026-10-03'))).toBe(
      'usageAnalytics.errorRangeOrder',
    );
    expect(validateSelection(custom('2026-07-08', '2026-10-05'))).toBeNull();
    expect(validateSelection(custom('2026-07-07', '2026-10-05'))).toBe(
      'usageAnalytics.errorRangeTooWide',
    );
  });
});

describe('small helpers', () => {
  it('labels only known tools', () => {
    expect(toolLabelKey('WEB_SEARCH')).toBe('usageAnalytics.tools.WEB_SEARCH');
    expect(toolLabelKey('IMAGE')).toBeNull();
  });

  it('keeps a non-zero bucket visible and an empty one flat', () => {
    expect(barPercent(1, 1000)).toBe(2);
    expect(barPercent(0, 1000)).toBe(0);
    expect(barPercent(500, 1000)).toBe(50);
  });

  it('formats bucket labels in UTC', () => {
    expect(formatBucketLabel('2026-10-05T11:00:00.000Z', 'HOUR')).toBe('10-05 11:00');
    expect(formatBucketLabel('2026-10-05T00:00:00.000Z', 'DAY')).toBe('10-05');
  });
});
