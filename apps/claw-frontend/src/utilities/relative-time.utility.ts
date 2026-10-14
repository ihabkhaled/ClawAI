// SSR-safe relative-time formatter using `Intl.RelativeTimeFormat`.
// Returns strings like "5 minutes ago", "in 2 hours", "3 days ago".
// Falls back to the locale-default short date on environments without
// `Intl.RelativeTimeFormat` (very old browsers).

import {
  DAY_MS,
  HOUR_MS,
  MINUTE_MS,
  MONTH_DAYS,
  RELATIVE_TIME_REFRESH_FRESH_MS,
  RELATIVE_TIME_REFRESH_OLD_MS,
  RELATIVE_TIME_REFRESH_TODAY_MS,
  WEEK_DAYS,
  YEAR_DAYS,
  ISO_DATE_TIME_PATTERN,
  ISO_ZONE_SUFFIX_PATTERN,
} from '@/constants/relative-time.constants';
import { RelativeTimeUnit } from '@/enums/relative-time-unit.enum';
import type { FormatRelativeTimeOptions, RelativeBucket } from '@/types/relative-time.types';

type RelativeUnit = 'second' | 'minute' | 'hour' | 'day' | 'month' | 'year';

const UNITS: ReadonlyArray<{ unit: RelativeUnit; ms: number }> = [
  { unit: 'year', ms: 1000 * 60 * 60 * 24 * 365 },
  { unit: 'month', ms: 1000 * 60 * 60 * 24 * 30 },
  { unit: 'day', ms: 1000 * 60 * 60 * 24 },
  { unit: 'hour', ms: 1000 * 60 * 60 },
  { unit: 'minute', ms: 1000 * 60 },
  { unit: 'second', ms: 1000 },
];

export function formatTimeAgo(dateString: string, locale?: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const diffMs = date.getTime() - Date.now();

  if (typeof Intl === 'undefined' || typeof Intl.RelativeTimeFormat !== 'function') {
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  }

  const rtf = new Intl.RelativeTimeFormat(locale ?? 'en', { numeric: 'auto' });

  for (const { unit, ms } of UNITS) {
    const value = diffMs / ms;
    if (Math.abs(value) >= 1) {
      return rtf.format(Math.round(value), unit);
    }
  }
  return rtf.format(0, 'second');
}

/**
 * Epoch milliseconds for a stored instant, or null when it is not a date. The API sends ISO-8601
 * UTC with a trailing Z; a value that arrives without any zone is still read as UTC, never as the
 * visitor's local time.
 */
export function parseUtcTimestamp(value: string): number | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  const zoneless = ISO_DATE_TIME_PATTERN.test(value) && !ISO_ZONE_SUFFIX_PATTERN.test(value);
  const normalised = zoneless ? `${value.replace(' ', 'T')}Z` : value;
  const ms = Date.parse(normalised);
  return Number.isNaN(ms) ? null : ms;
}

/** Which unit and count describe an age. Under a minute, and any future time, is "just now" (null). */
export function resolveRelativeBucket(ageMs: number): RelativeBucket {
  if (!(ageMs >= MINUTE_MS)) {
    return null;
  }
  if (ageMs < HOUR_MS) {
    return { value: Math.floor(ageMs / MINUTE_MS), unit: RelativeTimeUnit.MINUTE };
  }
  if (ageMs < DAY_MS) {
    return { value: Math.floor(ageMs / HOUR_MS), unit: RelativeTimeUnit.HOUR };
  }
  const days = Math.floor(ageMs / DAY_MS);
  if (days < WEEK_DAYS) {
    return { value: days, unit: RelativeTimeUnit.DAY };
  }
  if (days < MONTH_DAYS) {
    return { value: Math.floor(days / WEEK_DAYS), unit: RelativeTimeUnit.WEEK };
  }
  if (days < YEAR_DAYS) {
    return { value: Math.min(Math.floor(days / MONTH_DAYS), 11), unit: RelativeTimeUnit.MONTH };
  }
  return { value: Math.floor(days / YEAR_DAYS), unit: RelativeTimeUnit.YEAR };
}

function safeLocale(locale: string): string {
  try {
    return Intl.getCanonicalLocales(locale)[0] ?? 'en';
  } catch {
    return 'en';
  }
}

/** "just now", "20 minutes ago", "yesterday", "3 weeks ago" in the given locale; '' if invalid. */
export function formatRelativeTime(options: FormatRelativeTimeOptions): string {
  const { iso, nowMs, locale, justNowLabel } = options;
  const then = parseUtcTimestamp(iso);
  if (then === null) {
    return '';
  }
  const bucket = resolveRelativeBucket(nowMs - then);
  if (bucket === null) {
    return justNowLabel;
  }
  const rtf = new Intl.RelativeTimeFormat(safeLocale(locale), { numeric: 'auto' });
  return rtf.format(-bucket.value, bucket.unit);
}

/** Full date and time in the visitor's own zone (or the injected `timeZone`); '' if invalid. */
export function formatFullDateTime(iso: string, locale: string, timeZone?: string): string {
  const ms = parseUtcTimestamp(iso);
  if (ms === null) {
    return '';
  }
  try {
    return new Intl.DateTimeFormat(safeLocale(locale), {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone,
    }).format(new Date(ms));
  } catch {
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(new Date(ms));
  }
}

/** Zone-independent text for server render, identical on server and first client paint. */
export function formatStableUtcDate(iso: string): string {
  const ms = parseUtcTimestamp(iso);
  return ms === null ? '' : new Date(ms).toISOString().slice(0, 10);
}

export function formatStableUtcDateTime(iso: string): string {
  const ms = parseUtcTimestamp(iso);
  return ms === null ? '' : `${new Date(ms).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

/** The normalised UTC ISO string for `<time datetime>`; '' if invalid. */
export function toUtcIsoString(iso: string): string {
  const ms = parseUtcTimestamp(iso);
  return ms === null ? '' : new Date(ms).toISOString();
}

/** How often a label of this age can change: 30 s under an hour, 1 min under a day, then 10 min. */
export function relativeTimeRefreshMs(iso: string, nowMs: number): number {
  const then = parseUtcTimestamp(iso);
  const age = then === null ? 0 : nowMs - then;
  if (age < HOUR_MS) {
    return RELATIVE_TIME_REFRESH_FRESH_MS;
  }
  return age < DAY_MS ? RELATIVE_TIME_REFRESH_TODAY_MS : RELATIVE_TIME_REFRESH_OLD_MS;
}
