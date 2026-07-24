// Financial direction of a PaymentTransaction row. Payment tables are
// append-only: a correction is a new compensating row, never an edit.
export enum PaymentTransactionType {
  CHARGE = 'CHARGE',
  // One-time prorated difference charged on an immediate upgrade.
  PRORATION_CHARGE = 'PRORATION_CHARGE',
  RENEWAL = 'RENEWAL',
  REFUND = 'REFUND',
  CHARGEBACK = 'CHARGEBACK',
}
