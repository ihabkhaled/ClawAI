import { MS_PER_HOUR, PRORATION_RATIO_SCALE } from '@claw/shared-constants';
import {
  CancellationSettlementMode,
  type RefundSettlement,
  type RefundSettlementInput,
  RefundSettlementKind,
} from '@claw/shared-types';

import { MoneyError } from './money-error';
import { MoneyErrorCode } from './money-error-code.enum';
import { assertNonNegativeMinor, multiplyByScaledRatio, subtractFloorZero } from './money.utility';
import { calculateRemainingRatioScaled } from './proration.utility';

// The exact, inclusive instant a cooling-off window closes.
//
// Inclusive matters: a customer who clicks at exactly 48:00:00.000 is entitled to
// their refund. Treating the boundary as exclusive turns a documented promise
// into a race against the network.
export function coolingOffExpiresAtMs(capturedAtMs: number, coolingOffHours: number): number {
  if (!Number.isFinite(capturedAtMs)) {
    throw new MoneyError(MoneyErrorCode.INVALID_PERIOD, 'capturedAtMs must be finite');
  }
  if (!Number.isFinite(coolingOffHours) || coolingOffHours < 0) {
    throw new MoneyError(MoneyErrorCode.INVALID_PERIOD, 'coolingOffHours must be non-negative');
  }
  return capturedAtMs + coolingOffHours * MS_PER_HOUR;
}

export function isWithinCoolingOff(
  capturedAtMs: number,
  coolingOffHours: number,
  nowMs: number,
): boolean {
  return nowMs <= coolingOffExpiresAtMs(capturedAtMs, coolingOffHours);
}

// How much of a capture may still be returned, by any mechanism.
//
// This is the ceiling every branch below is clamped to. Refunding more than a
// capture's remaining balance is not a rounding error — it is paying a customer
// money the business never took, and the provider will reject it or, worse,
// accept it.
export function calculateRemainingRefundableMinor(input: {
  capturedAmountMinor: number;
  priorRefundedMinor: number;
  disputedMinor: number;
  nonRefundableMinor: number;
}): number {
  assertNonNegativeMinor(input.capturedAmountMinor, 'capturedAmountMinor');
  assertNonNegativeMinor(input.priorRefundedMinor, 'priorRefundedMinor');
  assertNonNegativeMinor(input.disputedMinor, 'disputedMinor');
  assertNonNegativeMinor(input.nonRefundableMinor, 'nonRefundableMinor');

  const claimed = input.priorRefundedMinor + input.disputedMinor + input.nonRefundableMinor;
  return subtractFloorZero(input.capturedAmountMinor, claimed);
}

// Server-authoritative settlement for an immediate cancellation.
//
// Pure: no clock of its own, no database, no provider. Every input is supplied by
// the caller, which is what lets the 48-hour boundary be tested at millisecond
// precision instead of with a sleep.
export function calculateRefundSettlement(input: RefundSettlementInput): RefundSettlement {
  const remainingRefundableMinor = calculateRemainingRefundableMinor(input);
  const expiresAtMs = coolingOffExpiresAtMs(input.capturedAtMs, input.coolingOffHours);
  const withinCoolingOff = input.nowMs <= expiresAtMs;

  // Zero-length periods are legitimate for one-off charges; a zero ratio simply
  // means nothing is left unused.
  const remainingRatioScaled =
    input.periodEndMs > input.periodStartMs
      ? calculateRemainingRatioScaled(input.periodStartMs, input.periodEndMs, input.nowMs)
      : 0;

  const settled = resolveAmounts(input, {
    withinCoolingOff,
    remainingRefundableMinor,
    remainingRatioScaled,
  });

  return {
    ...settled,
    withinCoolingOff,
    coolingOffExpiresAtMs: expiresAtMs,
    remainingRefundableMinor,
    remainingRatioScaled,
  };
}

function resolveAmounts(
  input: RefundSettlementInput,
  context: {
    withinCoolingOff: boolean;
    remainingRefundableMinor: number;
    remainingRatioScaled: number;
  },
): { kind: RefundSettlementKind; refundAmountMinor: number; creditAmountMinor: number } {
  const { withinCoolingOff, remainingRefundableMinor, remainingRatioScaled } = context;

  if (remainingRefundableMinor === 0) {
    return { kind: RefundSettlementKind.NONE, refundAmountMinor: 0, creditAmountMinor: 0 };
  }

  if (input.mode === CancellationSettlementMode.FULL_ALWAYS) {
    return full(remainingRefundableMinor);
  }

  if (withinCoolingOff) {
    return full(remainingRefundableMinor);
  }

  // Past the window. The unused value is computed from the refundable base, not
  // the gross capture, so a prior partial refund cannot be handed back twice.
  const unusedMinor = Math.min(
    multiplyByScaledRatio(remainingRefundableMinor, remainingRatioScaled, PRORATION_RATIO_SCALE),
    remainingRefundableMinor,
  );

  switch (input.mode) {
    case CancellationSettlementMode.FULL_WITHIN_COOLING_OFF_THEN_UNUSED_PRORATED: {
      return unusedMinor === 0
        ? { kind: RefundSettlementKind.NONE, refundAmountMinor: 0, creditAmountMinor: 0 }
        : {
            kind: RefundSettlementKind.UNUSED_PRORATED,
            refundAmountMinor: unusedMinor,
            creditAmountMinor: 0,
          };
    }
    case CancellationSettlementMode.CREDIT_ONLY_AFTER_COOLING_OFF: {
      return unusedMinor === 0
        ? { kind: RefundSettlementKind.NONE, refundAmountMinor: 0, creditAmountMinor: 0 }
        : {
            kind: RefundSettlementKind.CREDIT_ONLY,
            refundAmountMinor: 0,
            creditAmountMinor: unusedMinor,
          };
    }
    case CancellationSettlementMode.FULL_WITHIN_COOLING_OFF_THEN_NO_REFUND: {
      return { kind: RefundSettlementKind.NONE, refundAmountMinor: 0, creditAmountMinor: 0 };
    }
    default: {
      // An unrecognised policy must not silently become "refund everything".
      // Failing closed here turns a bad migration into an error instead of an
      // unbounded payout.
      throw new MoneyError(
        MoneyErrorCode.INVALID_SCALE,
        `unsupported cancellation settlement mode: ${String(input.mode)}`,
      );
    }
  }
}

function full(remainingRefundableMinor: number): {
  kind: RefundSettlementKind;
  refundAmountMinor: number;
  creditAmountMinor: number;
} {
  return {
    kind: RefundSettlementKind.FULL,
    refundAmountMinor: remainingRefundableMinor,
    creditAmountMinor: 0,
  };
}
