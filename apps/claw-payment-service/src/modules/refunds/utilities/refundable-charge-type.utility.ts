import { type PaymentTransactionType } from '@claw/shared-types';

import { REFUNDABLE_CHARGE_TYPES } from '../constants/refundable-charge.constants';

/**
 * Narrows the free-text `payment_transactions.type` column back to the enum.
 *
 * The column is TEXT, so a row written by a newer replica can name a type this
 * build has never heard of. Returning null — "we cannot classify this" — makes
 * the caller refuse the reversal rather than guess whether it should revoke a
 * plan or debit a wallet. Guessing wrong in either direction is a customer
 * losing something they paid for.
 */
export function toRefundableChargeType(value: string): PaymentTransactionType | null {
  return REFUNDABLE_CHARGE_TYPES.find((type) => type === value) ?? null;
}
