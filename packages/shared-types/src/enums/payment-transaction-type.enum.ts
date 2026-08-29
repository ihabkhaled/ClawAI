// Financial direction of a PaymentTransaction row. Payment tables are
// append-only: a correction is a new compensating row, never an edit.
export enum PaymentTransactionType {
  CHARGE = 'CHARGE',
  // One-time prorated difference charged on an immediate upgrade.
  PRORATION_CHARGE = 'PRORATION_CHARGE',
  RENEWAL = 'RENEWAL',
  REFUND = 'REFUND',
  CHARGEBACK = 'CHARGEBACK',
  // One-off purchase of PAYG connector credit. Carries no subscription: the
  // money buys a wallet balance, not an entitlement, so a reversal of one must
  // never revoke a plan (ADR-064 keeps its meaning; ADR-083 adds this member).
  CREDIT_TOPUP = 'CREDIT_TOPUP',
}
