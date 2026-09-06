import { MILLISECONDS_PER_DAY } from '../constants/trial-days.constants';

/**
 * Whole days left on a trial, rounded UP and floored at 0.
 *
 * Rounded up because a partial day is still a day the user has: a trial with
 * thirty minutes left is "1 day remaining", and reporting 0 there would read as
 * expired while the account still works. The result therefore only reaches 0
 * once `expiresAt` has genuinely passed, which keeps "0 days" and "expired" the
 * same statement rather than two subtly different ones.
 *
 * Millisecond arithmetic on absolute instants, not calendar walking: a trial is
 * a fixed 30-day duration from its grant, so no DST or month-length rule
 * applies, and Date subtraction is exact for this.
 */
export function resolveTrialDaysRemaining(expiresAt: Date, now: Date): number {
  const remainingMs = expiresAt.getTime() - now.getTime();
  if (remainingMs <= 0) {
    return 0;
  }
  return Math.ceil(remainingMs / MILLISECONDS_PER_DAY);
}
