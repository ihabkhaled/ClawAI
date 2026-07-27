import { apiClient } from '@/services/shared/api-client';
import type {
  AdminRefundableTransaction,
  AdminRefundView,
  CreateAdminRefundRequest,
} from '@/types';

const REFUNDS_BASE = '/admin/billing/refunds';

export const refundsRepository = {
  async listRefundableTransactions(): Promise<AdminRefundableTransaction[]> {
    const response = await apiClient.get<AdminRefundableTransaction[]>(
      `${REFUNDS_BASE}/refundable-transactions`,
    );
    return response.data;
  },

  async create(input: CreateAdminRefundRequest): Promise<AdminRefundView> {
    const response = await apiClient.post<AdminRefundView>(REFUNDS_BASE, input);
    return response.data;
  },
};
