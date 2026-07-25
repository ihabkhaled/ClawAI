// UTC period keys for quota windows. Every key is derived in UTC so a user
// cannot reset a counter by changing timezone, and so two replicas in different
// regions always agree on which bucket a request belongs to.

// YYYY-MM-DD
export function utcDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

// ISO-8601 week key, YYYY-Www. Uses the ISO rule (week 1 contains the first
// Thursday), which is why the year in the key is the ISO week-year and can
// differ from the calendar year at a year boundary — 2027-01-01 belongs to
// 2026-W53. Deriving it from the calendar year would put two different weeks
// in the same bucket once a year.
export function isoWeekKey(now: Date): string {
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // Shift to the Thursday of the current ISO week (Mon=1 … Sun=7).
  const dayNumber = target.getUTCDay() === 0 ? 7 : target.getUTCDay();
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const isoYear = target.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDayNumber = firstThursday.getUTCDay() === 0 ? 7 : firstThursday.getUTCDay();
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - firstDayNumber);
  const week =
    1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

// YYYY-MM
export function utcMonthKey(now: Date): string {
  return now.toISOString().slice(0, 7);
}

export function secondsUntilEndOfUtcDay(now: Date): number {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((end - now.getTime()) / 1000));
}

// Seconds to the end of the ISO week (Sunday 24:00 UTC).
export function secondsUntilEndOfIsoWeek(now: Date): number {
  const dayNumber = now.getUTCDay() === 0 ? 7 : now.getUTCDay();
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + (8 - dayNumber));
  return Math.max(1, Math.ceil((end - now.getTime()) / 1000));
}

export function secondsUntilEndOfUtcMonth(now: Date): number {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return Math.max(1, Math.ceil((end - now.getTime()) / 1000));
}
