import { QuotaWindow } from '@claw/shared-types';

// Redis key for a user's running token total on a given day.
export function quotaKey(userId: string, date: string): string {
  return `quota:${userId}:${date}`;
}

// Seconds until end of day in UTC — TTL for the Redis counter so it resets
// daily without a cron. (QUOTA_RESET_TZ defaults to UTC.)
export function secondsUntilEndOfUtcDay(now: Date): number {
  const endOfDay = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.max(1, Math.ceil((endOfDay - now.getTime()) / 1000));
}

// YYYY-MM-DD in UTC — the ledger date key.
export function utcDateString(now: Date): string {
  return now.toISOString().slice(0, 10);
}

// Redis key for a user's running token total in the week or month window. The
// DAY window keeps the legacy `quota:<user>:<date>` shape (see quotaKey) so an
// in-flight day's counter is not orphaned by this addition.
export function quotaWindowKey(userId: string, window: QuotaWindow, periodKey: string): string {
  if (window === QuotaWindow.DAY) {
    return quotaKey(userId, periodKey);
  }
  return `quota:${userId}:${window.toLowerCase()}:${periodKey}`;
}

// TTL for a window counter so it resets without a cron. WEEK expires at the
// start of next ISO Monday, MONTH at the start of next month, both UTC.
export function secondsUntilEndOfWindow(window: QuotaWindow, now: Date): number {
  const end = windowEndMs(window, now);
  return Math.max(1, Math.ceil((end - now.getTime()) / 1000));
}

function windowEndMs(window: QuotaWindow, now: Date): number {
  if (window === QuotaWindow.WEEK) {
    const dayNumber = now.getUTCDay() === 0 ? 7 : now.getUTCDay();
    return Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + (8 - dayNumber),
      0,
      0,
      0,
      0,
    );
  }
  if (window === QuotaWindow.MONTH) {
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0);
  }
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
}
