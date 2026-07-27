import type { CheckoutSession, PaymentTransaction } from '../../../generated/prisma';

export type ReconciliationTransactionCandidate = PaymentTransaction & {
  checkoutSession: CheckoutSession | null;
};
