// Settlement state of a PaymentTransaction. Only CAPTURED is treated as money
// actually received; PENDING never grants entitlement.
export enum PaymentTransactionStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  // Provider call timed out — real state unknown until reconciliation resolves it.
  UNRESOLVED = 'UNRESOLVED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  REVERSED = 'REVERSED',
}
