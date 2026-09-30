import {
  USAGE_BREAKDOWN_DAY_MS,
  USAGE_BREAKDOWN_DEFAULT_DAYS,
  USAGE_BREAKDOWN_MAX_DAYS,
} from '../constants/usage-attribution.constants';
import { type UsageWindow, type UsageWindowQuery } from '../types/usage-attribution.types';

/**
 * The window a breakdown covers, or null when the one asked for is not allowed.
 *
 * `to` defaults to now and `from` to thirty days before `to`. A window that
 * runs backwards, is empty, or is wider than the cap is refused rather than
 * clamped, so a client never reads a total for a range it did not ask for.
 */
export function resolveUsageWindow(query: UsageWindowQuery, now: Date): UsageWindow | null {
  const to = query.to === undefined ? now : new Date(query.to);
  const from =
    query.from === undefined
      ? new Date(to.getTime() - USAGE_BREAKDOWN_DEFAULT_DAYS * USAGE_BREAKDOWN_DAY_MS)
      : new Date(query.from);
  const span = to.getTime() - from.getTime();
  return span <= 0 || span > USAGE_BREAKDOWN_MAX_DAYS * USAGE_BREAKDOWN_DAY_MS
    ? null
    : { from, to };
}
