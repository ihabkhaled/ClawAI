// The outcome a settlement calculation resolved to. Persisted on the refund so
// the reason for an amount is recoverable without re-running policy against
// today's rules.
export enum RefundSettlementKind {
  // The whole remaining refundable balance, to the original payment method.
  FULL = 'FULL',
  // The unused prorated remainder of the current period, to the original method.
  UNUSED_PRORATED = 'UNUSED_PRORATED',
  // Unused value issued as non-withdrawable billing credit, not cash.
  CREDIT_ONLY = 'CREDIT_ONLY',
  // Nothing is owed. Access still ends per the cancellation decision.
  NONE = 'NONE',
}
