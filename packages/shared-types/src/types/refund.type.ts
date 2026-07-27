import type { RefundStatus } from '../enums/refund-status.enum';

export type CreateRefundRequest = {
  paymentTransactionId: string;
  amountMinor: number;
  idempotencyKey: string;
  reason: string;
};

export type RefundView = {
  id: string;
  paymentTransactionId: string;
  status: RefundStatus;
  amountMinor: number;
  currency: string;
  reason: string;
  createdAt: string;
  completedAt: string | null;
};

export type RefundableTransactionView = {
  id: string;
  userId: string;
  subscriptionId: string;
  gateway: string;
  capturedAmountMinor: number;
  remainingAmountMinor: number;
  currency: string;
  capturedAt: string;
};
