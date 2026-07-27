import { type PaymentTransaction, type Refund, type Subscription } from '../../../generated/prisma';

export type RequestRefundInput = {
  requestedByUserId: string;
  paymentTransactionId: string;
  amountMinor: number;
  idempotencyKey: string;
  reason: string;
};

export type RefundableCharge = {
  id: string;
  userId: string;
  subscriptionId: string;
  gateway: string;
  amountMinor: number;
  currency: string;
  providerTransactionId: string;
};

export type RefundableChargeSummary = Omit<RefundableCharge, 'providerTransactionId'> & {
  capturedAt: Date;
  reservedAmounts: number[];
};

export type ReserveRefundInput = RequestRefundInput & {
  charge: RefundableCharge;
  providerIdempotencyKey: string;
};

export type RefundRecord = Refund;

export type RefundCompletionContext = {
  refund: Refund;
  charge: PaymentTransaction;
  subscription: Subscription;
};
