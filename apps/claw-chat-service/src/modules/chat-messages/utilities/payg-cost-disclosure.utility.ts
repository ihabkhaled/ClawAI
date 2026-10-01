import { PaygBillingMode, type PaygFinalizeOutcome } from '@claw/shared-types';

/**
 * The settled cost a caller may show the user, or `undefined` for "show none".
 *
 * The second of two locks (F108, ADR-078 addendum). auth-service already omits
 * the cost for anyone it does not name PAYG; this refuses it again unless the
 * reply positively says `PAYG`, so a missing outcome (an old auth-service, a
 * failed finalize), an unrecognised or `UNKNOWN` mode, a `SUBSCRIPTION`, a
 * stray cost on a non-PAYG reply, and a non-integer all collapse to the same
 * answer: no cost. Zero is a real cost and survives.
 */
export function paygDisclosableCost(outcome: PaygFinalizeOutcome | undefined): number | undefined {
  if (outcome?.billingMode !== PaygBillingMode.PAYG) {
    return undefined;
  }
  const cost = outcome.settledCostMicroUsd;
  return typeof cost === 'number' && Number.isSafeInteger(cost) && cost >= 0 ? cost : undefined;
}
