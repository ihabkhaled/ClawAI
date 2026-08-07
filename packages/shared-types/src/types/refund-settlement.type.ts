import type { CancellationSettlementMode } from '../enums/cancellation-settlement-mode.enum';
import type { RefundSettlementKind } from '../enums/refund-settlement-kind.enum';

// Everything the settlement calculation is allowed to consider.
//
// Note what is absent: no client-supplied amount, no client clock, no requested
// currency. `capturedAtMs` must come from provider-confirmed capture time —
// checkout creation, invoice issue and request arrival are all forgeable or
// merely adjacent to the moment money actually moved.
export type RefundSettlementInput = {
  mode: CancellationSettlementMode;
  // Length of the cooling-off window. Plan-configurable; 48 by default.
  coolingOffHours: number;
  // Provider-confirmed capture time.
  capturedAtMs: number;
  // Server clock at evaluation.
  nowMs: number;
  capturedAmountMinor: number;
  // Refunds already succeeded or reserved as PENDING against this capture.
  priorRefundedMinor: number;
  // Amounts lost to disputes/chargebacks — economically already reversed.
  disputedMinor: number;
  // Setup fees and similar components the plan marks as non-refundable.
  nonRefundableMinor: number;
  // Paid period bounds, for the prorated branch.
  periodStartMs: number;
  periodEndMs: number;
};

export type RefundSettlement = {
  kind: RefundSettlementKind;
  withinCoolingOff: boolean;
  // Exact inclusive boundary, returned so a UI can show it without recomputing.
  coolingOffExpiresAtMs: number;
  // captured - priorRefunds - disputes - non-refundable components, floored at 0.
  // The hard ceiling on anything this calculation may return.
  remainingRefundableMinor: number;
  // Cash back to the original payment method.
  refundAmountMinor: number;
  // Non-withdrawable billing credit issued instead of cash.
  creditAmountMinor: number;
  // Scaled integer (PRORATION_RATIO_SCALE) of the period left unused.
  remainingRatioScaled: number;
};
