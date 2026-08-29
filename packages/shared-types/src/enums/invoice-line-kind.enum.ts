// Semantic role of an invoice line. CREDIT lines carry a negative amount;
// every other kind is non-negative. The sum of lines equals the invoice total.
export enum InvoiceLineKind {
  SUBSCRIPTION = 'SUBSCRIPTION',
  PRORATION_CHARGE = 'PRORATION_CHARGE',
  PRORATION_CREDIT = 'PRORATION_CREDIT',
  DISCOUNT = 'DISCOUNT',
  TAX = 'TAX',
  REFUND = 'REFUND',
  // A purchased PAYG credit package. Priced from an immutable
  // CreditPackageVersion, never from anything the buyer sent.
  CREDIT_TOPUP = 'CREDIT_TOPUP',
}
