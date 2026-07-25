import type { BillingInterval } from '../enums/billing-interval.enum';
import type { ProrationQuoteStatus } from '../enums/proration-quote-status.enum';

// A server-computed, short-lived price promise for a plan change.
//
// remainingRatio = remainingPeriodMs / totalPeriodMs
// unusedCurrentCredit  = currentPeriodPrice * remainingRatio
// targetRemainingCharge = targetPeriodPrice  * remainingRatio
// amountDue = max(0, targetRemainingCharge - unusedCurrentCredit)
//
// Rounding happens ONCE, at the final minor-unit boundary.
export type ProrationQuote = {
  id: string;
  subscriptionId: string;
  currentPlanId: string;
  currentPlanSlug: string;
  currentPriceVersionId: string;
  currentAmountMinor: number;
  targetPlanId: string;
  targetPlanSlug: string;
  targetPriceVersionId: string;
  targetAmountMinor: number;
  targetBillingInterval: BillingInterval;
  currency: string;
  effectiveAt: string;
  // Scaled integer (see PRORATION_RATIO_SCALE) — never a float.
  remainingRatioScaled: number;
  unusedCurrentCreditMinor: number;
  targetRemainingChargeMinor: number;
  amountDueMinor: number;
  // True when the change is a downgrade and therefore deferred to period end.
  isScheduledForPeriodEnd: boolean;
  scheduledEffectiveAt: string | null;
  status: ProrationQuoteStatus;
  expiresAt: string;
};

// Pure inputs to the proration calculation, so the maths can be unit- and
// property-tested without a database.
export type ProrationInput = {
  currentPeriodPriceMinor: number;
  targetPeriodPriceMinor: number;
  periodStartMs: number;
  periodEndMs: number;
  effectiveAtMs: number;
};

export type ProrationResult = {
  remainingRatioScaled: number;
  unusedCurrentCreditMinor: number;
  targetRemainingChargeMinor: number;
  amountDueMinor: number;
};
