/**
 * The inclusive UTC instant the credit-consumption window opens at.
 *
 * Anchored to the FIRST of the month `months - 1` back, not to "now minus N
 * months", so the oldest bucket the query returns is a whole month rather than
 * a fragment of one. A window that started mid-month would report, say, nine
 * days of August beside a full September and invite the reader to compare them.
 *
 * `Date.UTC` normalises a negative month index into the previous year on its
 * own, so December-to-January needs no special case here.
 */
export function buildCreditMonthWindowStart(now: Date, months: number): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
}
