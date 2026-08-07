import type { ProrationLineItemType } from '../enums/proration-line-item-type.enum';
import type { ProrationMode } from '../enums/proration-mode.enum';

// One priced component of a plan change. Negative for credits.
export type ProrationLineItem = {
  type: ProrationLineItemType;
  amountMinor: number;
};

// The full, explainable result of pricing a plan change.
//
// Every field is an integer minor-unit amount in one currency. The caller is
// responsible for having already rejected a cross-currency change; this
// calculator has no currency and cannot detect one.
//
// Invariants held by the calculator and asserted in its tests:
//
//   usedCurrentValueMinor + unusedCurrentCreditMinor === currentPeriodPriceMinor
//   creditAppliedMinor + creditSurplusMinor          === unusedCurrentCreditMinor
//   sum(lineItems)                                    === amountDueMinor
//   amountDueMinor >= 0
export type ProrationBreakdown = {
  mode: ProrationMode;
  // Bumped whenever the arithmetic changes, and persisted on the quote so an old
  // charge stays reproducible after the calculator moves on.
  calculatorVersion: number;
  // Scaled integer (PRORATION_RATIO_SCALE) — never a float.
  remainingRatioScaled: number;
  // Value of the current plan already consumed. Derived by subtraction so that
  // used + unused is exactly the price paid, with no second rounding.
  usedCurrentValueMinor: number;
  unusedCurrentCreditMinor: number;
  // What the target plan costs under this mode: a full period when the cycle
  // resets, the remainder of the current period when it does not.
  targetChargeBaseMinor: number;
  // Credit actually consumed by this change, capped at the target charge.
  creditAppliedMinor: number;
  // Credit that exceeded the target charge. Carried forward as non-withdrawable
  // billing credit under policy — never paid out as cash.
  creditSurplusMinor: number;
  amountDueMinor: number;
  // True when a successful payment starts a new complete billing period.
  resetsBillingCycle: boolean;
  lineItems: readonly ProrationLineItem[];
};

// Pure inputs to a mode-aware plan change calculation.
export type ProrationBreakdownInput = {
  mode: ProrationMode;
  currentPeriodPriceMinor: number;
  targetPeriodPriceMinor: number;
  periodStartMs: number;
  periodEndMs: number;
  effectiveAtMs: number;
};
