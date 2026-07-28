import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCancelSubscription } from '@/hooks/billing/use-cancel-subscription';
import { queryKeys } from '@/repositories/shared/query-keys';

const mockCancel = vi.fn();
const mockResume = vi.fn();
const mockEndNow = vi.fn();

vi.mock('@/repositories/billing/billing.repository', () => ({
  billingRepository: {
    cancel: (...args: unknown[]) => mockCancel(...args),
    resume: (...args: unknown[]) => mockResume(...args),
    endSubscriptionNow: (...args: unknown[]) => mockEndNow(...args),
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/utilities/toast.utility', () => ({
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function makeHarness(): {
  queryClient: QueryClient;
  wrapper: (props: { children: ReactNode }) => ReactElement;
} {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    wrapper: function Wrapper({ children }: { children: ReactNode }): ReactElement {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    },
  };
}

describe('useCancelSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates the current subscription immediately after scheduled cancellation', async () => {
    const updated = { id: 'subscription-1', cancelAtPeriodEnd: true };
    mockCancel.mockResolvedValue(updated);
    const harness = makeHarness();
    const { result } = renderHook(() => useCancelSubscription(), {
      wrapper: harness.wrapper,
    });

    act(() => result.current.cancel());

    await waitFor(() => {
      expect(harness.queryClient.getQueryData(queryKeys.billing.current())).toEqual(updated);
    });
  });

  it('updates the current subscription immediately after resume', async () => {
    const updated = { id: 'subscription-1', cancelAtPeriodEnd: false };
    mockResume.mockResolvedValue(updated);
    const harness = makeHarness();
    const { result } = renderHook(() => useCancelSubscription(), {
      wrapper: harness.wrapper,
    });

    act(() => result.current.resume());

    await waitFor(() => {
      expect(harness.queryClient.getQueryData(queryKeys.billing.current())).toEqual(updated);
    });
  });

  it('clears the current subscription immediately after terminal removal', async () => {
    mockEndNow.mockResolvedValue({ id: 'subscription-1', status: 'CANCELLED' });
    const harness = makeHarness();
    harness.queryClient.setQueryData(queryKeys.billing.current(), {
      id: 'subscription-1',
      cancelAtPeriodEnd: true,
    });
    const { result } = renderHook(() => useCancelSubscription(), {
      wrapper: harness.wrapper,
    });

    act(() => result.current.endNow());

    await waitFor(() => {
      expect(harness.queryClient.getQueryData(queryKeys.billing.current())).toBeNull();
    });
  });
});
