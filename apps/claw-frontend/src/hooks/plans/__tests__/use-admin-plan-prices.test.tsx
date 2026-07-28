import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminPlanPrices } from '@/hooks/plans/use-admin-plan-prices';
import { queryKeys } from '@/repositories/shared/query-keys';

const mockGetPlan = vi.fn();
const mockListPrices = vi.fn();
const mockPublishPrice = vi.fn();
const mockSubscriberCounts = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'plan-1' }),
}));

vi.mock('@/hooks/auth/use-current-user', () => ({
  useCurrentUser: () => ({
    user: { id: 'admin-1', role: 'ADMIN' },
  }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en-US',
  }),
}));

vi.mock('@/repositories/admin/plans.repository', () => ({
  plansRepository: {
    get: (...args: unknown[]) => mockGetPlan(...args),
    listPriceVersions: (...args: unknown[]) => mockListPrices(...args),
    publishPrice: (...args: unknown[]) => mockPublishPrice(...args),
  },
}));

vi.mock('@/repositories/admin/billing-dashboard.repository', () => ({
  billingDashboardRepository: {
    getPriceVersionSubscriberCounts: (...args: unknown[]) => mockSubscriberCounts(...args),
  },
}));

vi.mock('@/utilities', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    showToast: {
      success: vi.fn(),
      apiError: vi.fn(),
    },
  };
});

function makeWrapper(queryClient: QueryClient): (props: { children: ReactNode }) => ReactElement {
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useAdminPlanPrices', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    mockGetPlan.mockResolvedValue({ id: 'plan-1', name: 'Test' });
    mockListPrices.mockResolvedValue([]);
    mockSubscriberCounts.mockResolvedValue([]);
    mockPublishPrice.mockResolvedValue({
      id: 'price-1',
      planId: 'plan-1',
      billingInterval: 'MONTHLY',
      currency: 'USD',
      amountMinor: 10_000,
      version: 1,
      isActive: true,
      effectiveFrom: '2026-07-28T00:00:00.000Z',
      retiredAt: null,
      createdAt: '2026-07-28T00:00:00.000Z',
    });
  });

  it('publishes a whole-number admin amount as major currency units', async () => {
    const { result } = renderHook(() => useAdminPlanPrices(), {
      wrapper: makeWrapper(queryClient),
    });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setAmount('100');
    });
    await waitFor(() => {
      expect(result.current.amount).toBe('100');
    });
    act(() => {
      result.current.publish();
    });

    await waitFor(() => {
      expect(mockPublishPrice).toHaveBeenCalledWith('plan-1', {
        billingInterval: 'MONTHLY',
        currency: 'USD',
        amountMinor: 10_000,
      });
    });
  });

  it('invalidates the customer billing-plan cache after publishing a price', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useAdminPlanPrices(), {
      wrapper: makeWrapper(queryClient),
    });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setAmount('1');
    });
    await waitFor(() => {
      expect(result.current.amount).toBe('1');
    });
    act(() => {
      result.current.publish();
    });

    await waitFor(() => {
      expect(mockPublishPrice).toHaveBeenCalled();
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.billing.plans() });
  });
});
