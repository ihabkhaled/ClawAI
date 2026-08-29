import { utcMonthKey } from '../../../common/utilities/period-key.utility';

/**
 * Which grant period an instant belongs to.
 *
 * The calendar UTC month, matching the `PROVIDER_COST` window the wallet
 * replaces. Deliberately NOT the subscription's anniversary date: the allowance
 * this wallet grants IS `monthlyProviderCostCeilingMicroUsd`, which has always
 * been enforced on a calendar month, and moving it to an anniversary would
 * silently give every mid-month subscriber a partial or a double period exactly
 * once, on the deploy.
 */
export function currentGrantPeriodKey(now: Date): string {
  return utcMonthKey(now);
}

/**
 * Midnight UTC on the first of the next month — when the GRANT bucket resets.
 *
 * Stored on the wallet rather than derived at read time so the UI's countdown
 * and the renewal job cannot disagree about the boundary.
 */
export function nextGrantResetAt(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}
