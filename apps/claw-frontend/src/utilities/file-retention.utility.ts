const MILLIS_PER_DAY = 86_400_000;

/**
 * Pure helper: returns the ceiling number of whole days between `nowMillis`
 * and the ISO-8601 expiry timestamp.
 *
 *  - Returns `NaN` when `iso` is not parseable.
 *  - Returns `0` when expiry is the same calendar instant or in the past.
 *  - Returns a positive integer (>= 1) when expiry is in the future. The
 *    ceiling rounds partial days up so a file expiring in 2 hours still
 *    reports `1` (i.e. "Expires in 1 day"). Callers can detect "today" by
 *    checking the explicit zero return when `iso <= nowMillis`.
 *
 * Pure — takes `nowMillis` as input so the caller controls the clock,
 * which makes the function trivially unit-testable with fixed timestamps.
 */
export function daysUntilExpiry(iso: string, nowMillis: number): number {
  const expiresMillis = Date.parse(iso);
  if (Number.isNaN(expiresMillis)) {
    return Number.NaN;
  }

  const deltaMillis = expiresMillis - nowMillis;
  if (deltaMillis <= 0) {
    return 0;
  }

  return Math.ceil(deltaMillis / MILLIS_PER_DAY);
}
