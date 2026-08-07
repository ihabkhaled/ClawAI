import { PRORATION_CALCULATOR_VERSION, PRORATION_RATIO_SCALE } from '@claw/shared-constants';
import {
  type ProrationBreakdown,
  type ProrationBreakdownInput,
  type ProrationInput,
  type ProrationLineItem,
  ProrationLineItemType,
  ProrationMode,
  type ProrationResult,
} from '@claw/shared-types';

import { MoneyError } from './money-error';
import { MoneyErrorCode } from './money-error-code.enum';
import {
  assertNonNegativeMinor,
  multiplyByScaledRatio,
  roundHalfUpDivide,
  subtractFloorZero,
  sumMinor,
} from './money.utility';

// Fraction of the current period still unused, as a scaled integer.
//
// Clamped to [0, SCALE]: an effectiveAt before the period start would otherwise
// credit more than was paid, and one after the end would produce a negative
// ratio and a negative charge.
export function calculateRemainingRatioScaled(
  periodStartMs: number,
  periodEndMs: number,
  effectiveAtMs: number,
): number {
  if (!Number.isFinite(periodStartMs) || !Number.isFinite(periodEndMs)) {
    throw new MoneyError(MoneyErrorCode.INVALID_PERIOD, 'period bounds must be finite');
  }
  const totalMs = periodEndMs - periodStartMs;
  if (totalMs <= 0) {
    throw new MoneyError(
      MoneyErrorCode.INVALID_PERIOD,
      'periodEndMs must be strictly after periodStartMs',
    );
  }
  const remainingMs = periodEndMs - effectiveAtMs;
  if (remainingMs <= 0) {
    return 0;
  }
  if (remainingMs >= totalMs) {
    return PRORATION_RATIO_SCALE;
  }
  return roundHalfUpDivide(remainingMs * PRORATION_RATIO_SCALE, totalMs);
}

// Exact server-side proration for an immediate plan change.
//
//   unusedCurrentCredit   = currentPeriodPrice * remainingRatio
//   targetRemainingCharge = targetPeriodPrice  * remainingRatio
//   amountDue             = max(0, targetRemainingCharge - unusedCurrentCredit)
//
// Worked example from the spec: $20/mo -> $30/mo, one day into a 30-day period.
// remainingRatio = 29/30, so amountDue = (3000 - 2000) * 29/30 = 967 minor units
// ($9.67). Each side is rounded once, at the minor-unit boundary.
export function calculateProration(input: ProrationInput): ProrationResult {
  assertNonNegativeMinor(input.currentPeriodPriceMinor, 'currentPeriodPriceMinor');
  assertNonNegativeMinor(input.targetPeriodPriceMinor, 'targetPeriodPriceMinor');

  const remainingRatioScaled = calculateRemainingRatioScaled(
    input.periodStartMs,
    input.periodEndMs,
    input.effectiveAtMs,
  );

  const unusedCurrentCreditMinor = multiplyByScaledRatio(
    input.currentPeriodPriceMinor,
    remainingRatioScaled,
    PRORATION_RATIO_SCALE,
  );
  const targetRemainingChargeMinor = multiplyByScaledRatio(
    input.targetPeriodPriceMinor,
    remainingRatioScaled,
    PRORATION_RATIO_SCALE,
  );

  return {
    remainingRatioScaled,
    unusedCurrentCreditMinor,
    targetRemainingChargeMinor,
    amountDueMinor: subtractFloorZero(targetRemainingChargeMinor, unusedCurrentCreditMinor),
  };
}

// Mode-aware plan-change pricing.
//
// The two modes answer the same question differently, and the difference is
// commercial rather than arithmetic:
//
//   KEEP_CYCLE_PRORATE_DIFFERENCE  the customer keeps their renewal date and pays
//                                  only the upgrade delta for the time left
//   RESET_CYCLE_WITH_UNUSED_CREDIT the customer buys a whole new period of the
//                                  target plan and their unused value pays part
//                                  of it; the renewal date moves
//
// $5 -> $10 at day 10 of a 30-day period: 334 minor units under the first,
// 667 under the second. Neither is a bug. Which one applies is a plan policy
// decision, which is why the mode travels with the quote.
//
// All arithmetic is integer minor units. Each amount is rounded ONCE, and
// `usedCurrentValue` is derived by subtraction so that used + unused is exactly
// the price paid rather than two independently rounded halves that disagree.
export function calculateProrationBreakdown(input: ProrationBreakdownInput): ProrationBreakdown {
  assertNonNegativeMinor(input.currentPeriodPriceMinor, 'currentPeriodPriceMinor');
  assertNonNegativeMinor(input.targetPeriodPriceMinor, 'targetPeriodPriceMinor');

  const remainingRatioScaled = calculateRemainingRatioScaled(
    input.periodStartMs,
    input.periodEndMs,
    input.effectiveAtMs,
  );

  const unusedCurrentCreditMinor = multiplyByScaledRatio(
    input.currentPeriodPriceMinor,
    remainingRatioScaled,
    PRORATION_RATIO_SCALE,
  );
  const usedCurrentValueMinor = input.currentPeriodPriceMinor - unusedCurrentCreditMinor;

  const resetsBillingCycle = input.mode === ProrationMode.RESET_CYCLE_WITH_UNUSED_CREDIT;
  const targetChargeBaseMinor = resetsBillingCycle
    ? input.targetPeriodPriceMinor
    : multiplyByScaledRatio(
        input.targetPeriodPriceMinor,
        remainingRatioScaled,
        PRORATION_RATIO_SCALE,
      );

  // Credit can only ever offset this change. Any excess is carried forward under
  // policy — turning it into cash here would refund money the customer never
  // asked to have refunded, from a code path with no refund audit trail.
  const creditAppliedMinor = Math.min(unusedCurrentCreditMinor, targetChargeBaseMinor);
  const creditSurplusMinor = unusedCurrentCreditMinor - creditAppliedMinor;
  const amountDueMinor = subtractFloorZero(targetChargeBaseMinor, creditAppliedMinor);

  const lineItems: readonly ProrationLineItem[] = Object.freeze([
    {
      type: resetsBillingCycle
        ? ProrationLineItemType.TARGET_PLAN_FULL_PERIOD
        : ProrationLineItemType.TARGET_PLAN_REMAINING_PERIOD,
      amountMinor: targetChargeBaseMinor,
    },
    {
      type: ProrationLineItemType.UNUSED_PLAN_CREDIT,
      amountMinor: -creditAppliedMinor,
    },
  ]);

  // The contract a customer is shown must be the contract they are charged. A
  // line-item set that does not sum to the total is a presentation bug that
  // becomes a billing dispute, so it fails here rather than at the gateway.
  const lineItemTotal = sumMinor(lineItems.map((item) => item.amountMinor));
  if (lineItemTotal !== amountDueMinor) {
    throw new MoneyError(
      MoneyErrorCode.INVALID_PERIOD,
      `proration line items sum to ${String(lineItemTotal)} but amount due is ${String(amountDueMinor)}`,
    );
  }

  return {
    mode: input.mode,
    calculatorVersion: PRORATION_CALCULATOR_VERSION,
    remainingRatioScaled,
    usedCurrentValueMinor,
    unusedCurrentCreditMinor,
    targetChargeBaseMinor,
    creditAppliedMinor,
    creditSurplusMinor,
    amountDueMinor,
    resetsBillingCycle,
    lineItems,
  };
}

// Normalizes a yearly price to a monthly-equivalent so a monthly<->yearly switch
// can be prorated against a common period. Never mix the two raw amounts.
export function monthlyEquivalentMinor(yearlyAmountMinor: number): number {
  assertNonNegativeMinor(yearlyAmountMinor, 'yearlyAmountMinor');
  return roundHalfUpDivide(yearlyAmountMinor, 12);
}

// True when the change costs nothing now and should activate without creating a
// zero-value provider order (which most gateways reject anyway).
export function isZeroValueChange(result: ProrationResult): boolean {
  return result.amountDueMinor === 0;
}
