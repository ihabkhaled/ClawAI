// Immutable billing document state. Invoices are never rewritten — a
// correction is issued as a new invoice with compensating lines.
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  PAID = 'PAID',
  VOID = 'VOID',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  UNCOLLECTIBLE = 'UNCOLLECTIBLE',
}
