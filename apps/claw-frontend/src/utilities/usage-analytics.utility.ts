import {
  KNOWN_USAGE_TOOLS,
  MS_PER_DAY,
  MS_PER_HOUR,
  USAGE_MAX_HOURS,
  USAGE_MAX_RANGE_DAYS,
  USAGE_MONTH_DAYS,
  USAGE_WEEK_DAYS,
} from '@/constants/usage-analytics.constants';
import { UsageRangePreset } from '@/enums/usage-range-preset.enum';
import type {
  UsageRangeQuery,
  UsageRangeSelection,
  UsageSelectionIssue,
} from '@/types/admin-usage-analytics.types';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/u;

function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function parseUtcDate(value: string): number | null {
  if (!DATE_ONLY.test(value)) {
    return null;
  }
  const ms = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * The server query for a selection. `to` is left off for rolling presets so the
 * server clamps to ITS now: a client clock a few seconds ahead would otherwise
 * be rejected as a future-dated, over-wide range.
 *
 * "Month" is the rolling last 30 days and "week" the last 168 hours: both stay
 * inside the 90-day and 7-day-hourly limits with room to spare.
 */
export function buildRangeQuery(selection: UsageRangeSelection, now: Date): UsageRangeQuery {
  switch (selection.preset) {
    case UsageRangePreset.Today:
      return { from: startOfUtcDay(now).toISOString() };
    case UsageRangePreset.Hours:
      return { hours: selection.hours };
    case UsageRangePreset.Week:
      return { hours: USAGE_WEEK_DAYS * 24 };
    case UsageRangePreset.Month:
      return { from: new Date(now.getTime() - USAGE_MONTH_DAYS * MS_PER_DAY).toISOString() };
    case UsageRangePreset.Custom: {
      const from = parseUtcDate(selection.customFrom);
      const through = parseUtcDate(selection.customTo);
      return from === null || through === null
        ? {}
        : {
            from: new Date(from).toISOString(),
            // The end date is inclusive, so the window closes at the NEXT midnight.
            to: new Date(through + MS_PER_DAY).toISOString(),
          };
    }
  }
}

/** Translation key of the first problem with a selection, or null when it can be sent. */
export function validateSelection(selection: UsageRangeSelection): UsageSelectionIssue {
  if (selection.preset === UsageRangePreset.Hours) {
    return Number.isInteger(selection.hours) &&
      selection.hours >= 1 &&
      selection.hours <= USAGE_MAX_HOURS
      ? null
      : 'usageAnalytics.errorHours';
  }
  if (selection.preset !== UsageRangePreset.Custom) {
    return null;
  }
  const from = parseUtcDate(selection.customFrom);
  const through = parseUtcDate(selection.customTo);
  if (from === null || through === null) {
    return 'usageAnalytics.errorRangeMissing';
  }
  if (from > through) {
    return 'usageAnalytics.errorRangeOrder';
  }
  const days = Math.round((through - from) / MS_PER_DAY) + 1;
  return days > USAGE_MAX_RANGE_DAYS ? 'usageAnalytics.errorRangeTooWide' : null;
}

/** Translation key for a gated tool, or null when it has no label (render the raw code). */
export function toolLabelKey(tool: string): string | null {
  return KNOWN_USAGE_TOOLS.includes(tool) ? `usageAnalytics.tools.${tool}` : null;
}

/** Hours back from a count, used by tests and chips. */
export function hoursAgo(now: Date, hours: number): Date {
  return new Date(now.getTime() - hours * MS_PER_HOUR);
}

/** Bar height as a whole percent of the tallest bucket, never below 2 so a non-zero bucket shows. */
export function barPercent(value: number, max: number): number {
  if (value <= 0 || max <= 0) {
    return 0;
  }
  return Math.max(2, Math.round((value / max) * 100));
}

/** `2026-10-05T11:00:00.000Z` as `10-05 11:00` (hourly) or `10-05` (daily), in UTC. */
export function formatBucketLabel(iso: string, grain: 'HOUR' | 'DAY'): string {
  const day = iso.slice(5, 10);
  return grain === 'HOUR' ? `${day} ${iso.slice(11, 16)}` : day;
}
