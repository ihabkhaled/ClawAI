import type { BillingInterval } from '@claw/shared-types';
import { addCalendarMonths } from '@claw/shared-utilities';

import { MONTHS_BY_BILLING_INTERVAL } from '../constants/billing-period.constants';

/**
 * End of a billing period, computed on the calendar rather than by adding a
 * fixed number of milliseconds. See addCalendarMonths (@claw/shared-utilities)
 * for why: adding 30×N days drifts every renewal and silently loses a day in
 * a leap year.
 */
export function resolvePeriodEndMs(startMs: number, billingInterval: string): number {
  const months = MONTHS_BY_BILLING_INTERVAL[billingInterval as BillingInterval] ?? 1;
  return addCalendarMonths(startMs, months);
}
