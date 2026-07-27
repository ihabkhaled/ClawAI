import { beforeEach, describe, expect, it, vi } from 'vitest';

import { refundsRepository } from '@/repositories/admin/refunds.repository';
import type { CreateAdminRefundRequest } from '@/types';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

describe('refunds repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the refundable transaction ledger', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });

    await expect(refundsRepository.listRefundableTransactions()).resolves.toEqual([]);
    expect(mockGet).toHaveBeenCalledWith('/admin/billing/refunds/refundable-transactions');
  });

  it('posts the exact server-owned refund contract', async () => {
    const input: CreateAdminRefundRequest = {
      paymentTransactionId: 'charge-1',
      amountMinor: 2_500,
      idempotencyKey: 'refund-request-1',
      reason: 'Customer request',
    };
    mockPost.mockResolvedValueOnce({ data: { id: 'refund-1' } });

    await refundsRepository.create(input);

    expect(mockPost).toHaveBeenCalledWith('/admin/billing/refunds', input);
  });
});
