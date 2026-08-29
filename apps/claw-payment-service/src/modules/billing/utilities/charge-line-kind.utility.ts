import { InvoiceLineKind, PaymentTransactionType } from '@claw/shared-types';

/**
 * The invoice line a captured charge produces.
 *
 * A switch rather than a chain of ternaries so that adding a transaction type
 * without deciding how it appears on an invoice is a visible omission here,
 * not a row silently labelled SUBSCRIPTION. A credit top-up mislabelled that
 * way would read, on a customer's own invoice, as a second plan charge — which
 * is the shape of a dispute, not a cosmetic defect.
 */
export function resolveChargeLineKind(type: PaymentTransactionType): InvoiceLineKind {
  switch (type) {
    case PaymentTransactionType.PRORATION_CHARGE:
      return InvoiceLineKind.PRORATION_CHARGE;
    case PaymentTransactionType.CREDIT_TOPUP:
      return InvoiceLineKind.CREDIT_TOPUP;
    case PaymentTransactionType.CHARGE:
    case PaymentTransactionType.RENEWAL:
    case PaymentTransactionType.REFUND:
    case PaymentTransactionType.CHARGEBACK:
      return InvoiceLineKind.SUBSCRIPTION;
  }
}
