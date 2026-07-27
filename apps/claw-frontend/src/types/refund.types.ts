import type { TranslateFunction } from './i18n.types';

export type AdminRefundableTransaction = {
  id: string;
  userId: string;
  subscriptionId: string;
  gateway: string;
  capturedAmountMinor: number;
  remainingAmountMinor: number;
  currency: string;
  capturedAt: string;
};

export type CreateAdminRefundRequest = {
  paymentTransactionId: string;
  amountMinor: number;
  idempotencyKey: string;
  reason: string;
};

export type AdminRefundView = {
  id: string;
  paymentTransactionId: string;
  status: string;
  amountMinor: number;
  currency: string;
  reason: string;
  createdAt: string;
  completedAt: string | null;
};

export type UseAdminRefundsPageResult = {
  transactions: AdminRefundableTransaction[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  pendingId: string | null;
  mutationError: Error | null;
  requestRefund: (input: CreateAdminRefundRequest) => void;
  clearMutationError: () => void;
  retry: () => void;
  t: TranslateFunction;
};

export type RefundTransactionCardProps = {
  transaction: AdminRefundableTransaction;
  isPending: boolean;
  onRefund: (input: CreateAdminRefundRequest) => void;
  t: TranslateFunction;
};
