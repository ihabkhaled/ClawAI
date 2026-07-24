import { PRORATION_RATIO_SCALE } from '@claw/shared-constants';
import type { ProrationInput, ProrationResult } from '@claw/shared-types';

import { MoneyError } from './money-error';
import { MoneyErrorCode } from './money-error-code.enum';
import {
  assertNonNegativeMinor,
  multiplyByScaledRatio,
  roundHalfUpDivide,
  subtractFloorZero,
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
