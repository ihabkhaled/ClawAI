import { BillingInterval } from '@claw/shared-types';

/** Calendar months each billing interval spans. An unrecognized interval
 * falls back to 1 month at the call site, matching today's `else` behavior. */
export const MONTHS_BY_BILLING_INTERVAL: Record<BillingInterval, number> = {
  [BillingInterval.MONTHLY]: 1,
  [BillingInterval.QUARTERLY]: 3,
  [BillingInterval.SEMIANNUAL]: 6,
  [BillingInterval.YEARLY]: 12,
};
