import { type BillingInterval } from '@claw/shared-types';

// Every price here comes from an immutable PlanPriceVersion resolved
// server-side. Nothing in this shape may originate from a client request.
export type ProrationQuoteInput = {
  userId: string;
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
  periodStartMs: number;
  periodEndMs: number;
};

export type ProrationQuoteView = {
  quoteId: string;
  subscriptionId: string;
  targetPlanId: string;
  targetPlanSlug: string;
  targetPriceVersionId: string;
  currency: string;
  // Scaled integer — never a float.
  remainingRatioScaled: number;
  unusedCurrentCreditMinor: number;
  targetRemainingChargeMinor: number;
  amountDueMinor: number;
  // Downgrades take effect at period end so the user keeps what they paid for.
  isScheduledForPeriodEnd: boolean;
  scheduledEffectiveAtMs: number | null;
  expiresAtMs: number;
};
