import { PaymentTransactionType } from '@claw/shared-types';

/**
 * Charge types a reversal may name.
 *
 * `CREDIT_TOPUP` belongs here because it IS money captured from a customer. It
 * is absent from the operator's refundable-transactions list, which is
 * subscription-shaped by contract — the two lists answer different questions.
 *
 * REFUND and CHARGEBACK are deliberately excluded: they are already
 * compensating rows, and refunding one would be a second refund of the same
 * money in the opposite direction.
 */
export const REFUNDABLE_CHARGE_TYPES: readonly PaymentTransactionType[] = [
  PaymentTransactionType.CHARGE,
  PaymentTransactionType.RENEWAL,
  PaymentTransactionType.PRORATION_CHARGE,
  PaymentTransactionType.CREDIT_TOPUP,
];
