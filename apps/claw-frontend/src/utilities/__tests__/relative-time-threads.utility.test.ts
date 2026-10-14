import { describe, expect, it, vi } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { RelativeTimeUnit } from '@/enums/relative-time-unit.enum';
import { THREAD_TIME_TRANSLATIONS } from '@/lib/i18n/locales/thread-time-translations';
import { throttleByAge } from '@/utilities/relative-time-ticker.utility';
import {
  formatFullDateTime,
  formatRelativeTime,
  formatStableUtcDate,
  formatStableUtcDateTime,
  parseUtcTimestamp,
  relativeTimeRefreshMs,
  resolveRelativeBucket,
  toUtcIsoString,
} from '@/utilities/relative-time.utility';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const NOW = Date.parse('2026-10-14T12:00:00.000Z');

function ago(ms: number): string {
  return new Date(NOW - ms).toISOString();
}

function label(iso: string, locale = 'en'): string {
  return formatRelativeTime({ iso, nowMs: NOW, locale, justNowLabel: 'just now' });
}

describe('resolveRelativeBucket boundaries', () => {
  it.each([
    [0, null],
    [59_999, null],
    [-5 * MIN, null],
    [Number.NaN, null],
    [MIN, { value: 1, unit: RelativeTimeUnit.MINUTE }],
    [HOUR - 1, { value: 59, unit: RelativeTimeUnit.MINUTE }],
    [HOUR, { value: 1, unit: RelativeTimeUnit.HOUR }],
    [DAY - 1, { value: 23, unit: RelativeTimeUnit.HOUR }],
    [DAY, { value: 1, unit: RelativeTimeUnit.DAY }],
    [7 * DAY - 1, { value: 6, unit: RelativeTimeUnit.DAY }],
    [7 * DAY, { value: 1, unit: RelativeTimeUnit.WEEK }],
    [30 * DAY - 1, { value: 4, unit: RelativeTimeUnit.WEEK }],
    [30 * DAY, { value: 1, unit: RelativeTimeUnit.MONTH }],
    [364 * DAY, { value: 11, unit: RelativeTimeUnit.MONTH }],
    [365 * DAY, { value: 1, unit: RelativeTimeUnit.YEAR }],
    [800 * DAY, { value: 2, unit: RelativeTimeUnit.YEAR }],
  ])('%s ms', (age, expected) => {
    expect(resolveRelativeBucket(age)).toEqual(expected);
  });
});

describe('formatRelativeTime (en)', () => {
  it('uses singular, plural and "yesterday"', () => {
    expect(label(ago(30_000))).toBe('just now');
    expect(label(ago(MIN))).toBe('1 minute ago');
    expect(label(ago(20 * MIN))).toBe('20 minutes ago');
    expect(label(ago(HOUR))).toBe('1 hour ago');
    expect(label(ago(2 * HOUR))).toBe('2 hours ago');
    expect(label(ago(DAY))).toBe('yesterday');
    expect(label(ago(2 * DAY))).toBe('2 days ago');
    expect(label(ago(14 * DAY))).toBe('2 weeks ago');
    expect(label(ago(60 * DAY))).toBe('2 months ago');
    expect(label(ago(400 * DAY))).toBe('last year');
    expect(label(ago(800 * DAY))).toBe('2 years ago');
  });

  it('treats a future timestamp (clock skew) as just now', () => {
    expect(label(new Date(NOW + 5 * MIN).toISOString())).toBe('just now');
    expect(label(new Date(NOW + 30 * DAY).toISOString())).toBe('just now');
  });

  it('returns an empty string for invalid input', () => {
    expect(label('')).toBe('');
    expect(label('not a date')).toBe('');
    expect(label('2026-13-45T99:00:00Z')).toBe('');
  });

  it('falls back to English for a broken locale tag', () => {
    expect(label(ago(2 * HOUR), 'not_a_locale!!')).toBe('2 hours ago');
  });
});

describe('13 locales', () => {
  it.each(Object.values(Locale))('%s renders a non-empty, localised label', (locale) => {
    const text = formatRelativeTime({
      iso: ago(2 * HOUR),
      nowMs: NOW,
      locale,
      justNowLabel: THREAD_TIME_TRANSLATIONS[locale].justNow,
    });
    expect(text.length).toBeGreaterThan(0);
    if (locale !== Locale.EN) {
      expect(text).not.toBe('2 hours ago');
    }
    expect(THREAD_TIME_TRANSLATIONS[locale].justNow.length).toBeGreaterThan(0);
  });

  it('keeps the Arabic label in Arabic script', () => {
    expect(label(ago(3 * DAY), 'ar')).toMatch(/[؀-ۿ]/);
  });
});

describe('timestamps and zones', () => {
  it('reads a zoneless ISO string as UTC', () => {
    expect(parseUtcTimestamp('2026-10-14T12:00:00')).toBe(NOW);
    expect(parseUtcTimestamp('2026-10-14 12:00:00.000')).toBe(NOW);
    expect(parseUtcTimestamp('2026-10-14T14:00:00+02:00')).toBe(NOW);
    expect(toUtcIsoString('2026-10-14T14:00:00+02:00')).toBe('2026-10-14T12:00:00.000Z');
    expect(toUtcIsoString('nope')).toBe('');
  });

  it('shows the same instant in each injected zone, across a DST change', () => {
    // US clocks spring forward on 2026-03-08 at 07:00 UTC: 06:30Z is EST, 07:30Z is EDT.
    const before = formatFullDateTime('2026-03-08T06:30:00Z', 'en-US', 'America/New_York');
    const after = formatFullDateTime('2026-03-08T07:30:00Z', 'en-US', 'America/New_York');
    expect(before).toMatch(/1:30\s?AM/);
    expect(after).toMatch(/3:30\s?AM/);
    expect(formatFullDateTime('2026-10-14T12:00:00Z', 'en-US', 'Asia/Tokyo')).toMatch(/9:00\s?PM/);
    expect(formatFullDateTime('2026-10-14T12:00:00Z', 'en-US', 'UTC')).toMatch(/12:00\s?PM/);
  });

  it('relative age is a real duration, unaffected by a DST jump', () => {
    const then = '2026-03-08T06:30:00Z';
    const now = Date.parse('2026-03-08T07:30:00Z');
    expect(formatRelativeTime({ iso: then, nowMs: now, locale: 'en', justNowLabel: 'x' })).toBe(
      '1 hour ago',
    );
  });

  it('falls back to UTC for an unknown time zone and handles invalid input', () => {
    expect(formatFullDateTime('2026-10-14T12:00:00Z', 'en-US', 'Mars/Base')).toMatch(/12:00\s?PM/);
    expect(formatFullDateTime('bad', 'en')).toBe('');
  });

  it('gives hydration-safe UTC text', () => {
    expect(formatStableUtcDate('2026-10-14T23:59:00Z')).toBe('2026-10-14');
    expect(formatStableUtcDateTime('2026-10-14T23:59:00Z')).toBe('2026-10-14 23:59 UTC');
    expect(formatStableUtcDate('bad')).toBe('');
    expect(formatStableUtcDateTime('bad')).toBe('');
  });
});

describe('refresh pace', () => {
  it('is 30 s under an hour, 1 min under a day, 10 min after', () => {
    expect(relativeTimeRefreshMs(ago(10 * MIN), NOW)).toBe(30_000);
    expect(relativeTimeRefreshMs(ago(5 * HOUR), NOW)).toBe(60_000);
    expect(relativeTimeRefreshMs(ago(3 * DAY), NOW)).toBe(600_000);
    expect(relativeTimeRefreshMs('bad', NOW)).toBe(30_000);
  });

  it('throttles an old timestamp to its own pace', () => {
    let clock = NOW;
    const listener = vi.fn();
    const tick = throttleByAge(ago(3 * DAY), listener, () => clock);
    clock += 30_000;
    tick();
    expect(listener).not.toHaveBeenCalled();
    clock += 570_000;
    tick();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
