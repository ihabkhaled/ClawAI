import { type BillingGateway } from '@claw/shared-types';

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
  providerAmountMinor: number;
  providerCurrency: string;
  providerTransactionId: string;
};

export type RefundableChargeSummary = Omit<RefundableCharge, 'providerTransactionId'> & {
  capturedAt: Date;
  reservedAmounts: number[];
};

export type ReserveRefundInput = RequestRefundInput & {
  charge: RefundableCharge;
  providerAmountMinor: number;
  providerCurrency: string;
  providerIdempotencyKey: string;
};

export type RefundRecord = Refund;

export type RefundCompletionContext = {
  refund: Refund;
  charge: PaymentTransaction;
  subscription: Subscription | null;
};

export type AutomaticCompensationInput = {
  checkoutSessionId: string;
  userId: string;
  gateway: BillingGateway;
  providerTransactionId: string;
  providerOrderId: string | null;
  amountMinor: number;
  currency: string;
  failureCode: string;
  reason: string;
};

export type PreparedAutomaticCompensation = {
  refund: Refund;
  providerTransactionId: string;
  checkoutSessionId: string;
};
