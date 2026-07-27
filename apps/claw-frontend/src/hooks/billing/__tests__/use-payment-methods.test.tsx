import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePaymentMethods } from '@/hooks/billing/use-payment-methods';

const mockList = vi.fn();
const mockCreateSetup = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/repositories/billing/billing.repository', () => ({
  billingRepository: {
    listPaymentMethods: (...args: unknown[]) => mockList(...args),
    createPaymentMethodSetupSession: (...args: unknown[]) => mockCreateSetup(...args),
    deletePaymentMethod: (...args: unknown[]) => mockDelete(...args),
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
    apiError: vi.fn(),
  },
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('usePaymentMethods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
    mockCreateSetup.mockResolvedValue({
      id: 'setup-1',
      status: 'AWAITING_PAYMENT',
      gateway: 'PAYMOB',
      hostedCheckoutUrl: null,
      expiresAt: '2026-07-28T00:00:00.000Z',
    });
  });

  it('sends explicit storage consent and a bounded idempotency key', async () => {
    const { result } = renderHook(() => usePaymentMethods(), { wrapper: makeWrapper() });

    act(() => {
      result.current.startSetup();
    });

    await waitFor(() => {
      expect(mockCreateSetup).toHaveBeenCalledOnce();
    });
    expect(mockCreateSetup).toHaveBeenCalledWith({
      idempotencyKey: expect.any(String),
      consentToStore: true,
    });
  });

  it('surfaces setup failures persistently', async () => {
    mockCreateSetup.mockRejectedValue(new Error('unavailable'));
    const { result } = renderHook(() => usePaymentMethods(), { wrapper: makeWrapper() });

    act(() => {
      result.current.startSetup();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('billing.paymentMethods.setupFailed');
    });
  });
});
