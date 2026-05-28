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
