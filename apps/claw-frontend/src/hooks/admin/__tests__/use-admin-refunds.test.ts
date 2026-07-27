import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminRefunds } from '@/hooks/admin/use-admin-refunds';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockSuccess = vi.fn();
const mockApiError = vi.fn();

vi.mock('@/repositories/admin/refunds.repository', () => ({
  refundsRepository: {
    listRefundableTransactions: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/utilities', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    showToast: {
      success: (...args: unknown[]) => mockSuccess(...args),
      apiError: (...args: unknown[]) => mockApiError(...args),
    },
  };
});

function wrapper(): (props: { children: ReactNode }) => ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe('useAdminRefunds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reloads the ledger after a successful refund', async () => {
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue({ id: 'refund-1' });
    const { result } = renderHook(() => useAdminRefunds(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.requestRefund({
        paymentTransactionId: 'charge-1',
        amountMinor: 2_500,
        idempotencyKey: 'refund-request-1',
        reason: 'Customer request',
      });
    });

    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('surfaces a refund failure and clears the pending row', async () => {
    mockList.mockResolvedValue([]);
    mockCreate.mockRejectedValue(new Error('refund failed'));
    const { result } = renderHook(() => useAdminRefunds(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.requestRefund({
        paymentTransactionId: 'charge-1',
        amountMinor: 2_500,
        idempotencyKey: 'refund-request-2',
        reason: 'Customer request',
      });
    });

    await waitFor(() => expect(result.current.mutationError?.message).toBe('refund failed'));
    expect(result.current.pendingId).toBeNull();
    expect(mockApiError).toHaveBeenCalled();
  });
});
