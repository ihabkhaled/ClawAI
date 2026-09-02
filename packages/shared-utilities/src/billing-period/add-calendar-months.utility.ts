/**
 * Advances a timestamp by a whole number of calendar months, on the calendar
 * rather than by adding a fixed number of milliseconds.
 *
 * Adding N×30 days drifts a little further every period and silently loses a
 * day across a leap year; adding N calendar months and clamping to the target
 * month's real last day keeps the anniversary stable — 31 January + 1 month
 * lands on 28/29 February, never 3 March.
 */
export function addCalendarMonths(startMs: number, months: number): number {
  if (!Number.isInteger(months) || months < 1) {
    throw new RangeError(`months must be a positive integer, got ${months}`);
  }
  const end = new Date(startMs);
  const targetMonth = end.getUTCMonth() + months;
  const dayOfMonth = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(targetMonth);
  const lastDayOfTargetMonth = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
  ).getUTCDate();
  end.setUTCDate(Math.min(dayOfMonth, lastDayOfTargetMonth));
  return end.getTime();
}
