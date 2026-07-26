import { BillingInterval } from '@claw/shared-types';

/**
 * End of a billing period, computed on the calendar rather than by adding a
 * fixed number of milliseconds.
 *
 * Adding 30 days to 31 January lands on 2 March and drifts a little further
 * every renewal; adding 365 days silently loses a day in a leap year. Using
 * setUTCMonth keeps the anniversary stable, and JavaScript's own clamping
 * handles 31 January + 1 month landing on 28/29 February rather than 3 March.
 */
export function resolvePeriodEndMs(startMs: number, billingInterval: string): number {
  const end = new Date(startMs);
  if (billingInterval === BillingInterval.YEARLY) {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
    return end.getTime();
  }
  const targetMonth = end.getUTCMonth() + 1;
  const dayOfMonth = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(targetMonth);
  // Clamp to the last day of the target month: a 31st subscriber renewing into
  // February must land on the 28th, not roll forward into March.
  const lastDayOfTargetMonth = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
  ).getUTCDate();
  end.setUTCDate(Math.min(dayOfMonth, lastDayOfTargetMonth));
  return end.getTime();
}
