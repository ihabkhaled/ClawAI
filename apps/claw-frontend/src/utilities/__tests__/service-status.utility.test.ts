import { describe, expect, it } from 'vitest';

import {
  COMPONENT_STATE_APPEARANCE,
  STATUS_COMPONENT_LABEL_KEYS,
  UPTIME_WINDOW_LABEL_KEYS,
} from '@/constants/service-status.constants';
import { en } from '@/lib/i18n/locales/en';
import {
  formatCoveragePercent,
  formatIncidentDuration,
  formatIncidentTime,
  formatUptimePercent,
  isPartialCoverage,
} from '@/utilities/service-status.utility';

function lookup(key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        typeof node === 'object' && node !== null
          ? (node as Record<string, unknown>)[part]
          : undefined,
      en,
    );
}

describe('formatUptimePercent', () => {
  it('renders basis points as a two-decimal percentage', () => {
    expect(formatUptimePercent(10_000, 'en')).toBe('100.00%');
    expect(formatUptimePercent(9_965, 'en')).toBe('99.65%');
    expect(formatUptimePercent(0, 'en')).toBe('0.00%');
  });

  it('localizes the digits and separators', () => {
    expect(formatUptimePercent(9_965, 'de')?.replaceAll(/\s/gu, ' ')).toBe('99,65 %');
    expect(formatUptimePercent(9_965, 'ar')).not.toBe('99.65%');
  });

  it('is null when nothing was measured', () => {
    expect(formatUptimePercent(null, 'en')).toBeNull();
  });
});

describe('coverage', () => {
  it('flags a window measured for less than 99%', () => {
    expect(isPartialCoverage(9_899)).toBe(true);
    expect(isPartialCoverage(9_900)).toBe(false);
    expect(formatCoveragePercent(714, 'en')).toBe('7%');
  });
});

describe('formatIncidentDuration', () => {
  it('uses minutes, then hours and minutes, then days and hours', () => {
    expect(formatIncidentDuration(300, 'en')).toBe('5 min');
    expect(formatIncidentDuration(10, 'en')).toBe('1 min');
    expect(formatIncidentDuration(3_600, 'en')).toBe('1 hr');
    expect(formatIncidentDuration(5_100, 'en')).toBe('1 hr 25 min');
    expect(formatIncidentDuration(90_000, 'en')).toBe('1 day 1 hr');
    expect(formatIncidentDuration(172_800, 'en')).toBe('2 days');
  });
});

describe('formatIncidentTime', () => {
  it('formats an ISO timestamp for the locale', () => {
    expect(formatIncidentTime('2026-09-23T11:00:00.000Z', 'en')).toMatch(/2026/);
  });
});

describe('status label keys', () => {
  // t() does not type-check its key; a typo would render the raw key.
  it('all exist in the English dictionary', () => {
    const keys = [
      ...Object.values(STATUS_COMPONENT_LABEL_KEYS),
      ...Object.values(UPTIME_WINDOW_LABEL_KEYS),
      ...Object.values(COMPONENT_STATE_APPEARANCE).map((appearance) => appearance.labelKey),
    ];
    for (const key of keys) {
      expect(typeof lookup(key), key).toBe('string');
    }
  });
});
