import { type BillingGateway, type PaymentTransactionType } from '@claw/shared-types';

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
  /** Null for a PAYG credit top-up, which buys a balance and not a plan. */
  subscriptionId: string | null;
  /** Decides what a completed reversal means: revoke a plan, or debit a wallet. */
  type: PaymentTransactionType;
  gateway: string;
  amountMinor: number;
  currency: string;
  providerAmountMinor: number;
  providerCurrency: string;
  providerTransactionId: string;
};

/**
 * A refundable SUBSCRIPTION charge, for the operator list.
 *
 * `subscriptionId` is non-null here and nullable on `RefundableCharge` on
 * purpose: the admin refundable-transactions list is deliberately still
 * subscription-only, because `RefundableTransactionView` is a frontend contract
 * and widening it is a separate, user-visible change.
 */
export type RefundableChargeSummary = Omit<
  RefundableCharge,
  'providerTransactionId' | 'subscriptionId' | 'type'
> & {
  subscriptionId: string;
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
