import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BillingReturnPhase } from '@/enums/billing.enum';
import { usePaypalReturn } from '@/hooks/billing/use-paypal-return';

const mockComplete = vi.fn();
const mockReplace = vi.fn();
const searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => searchParams,
}));

vi.mock('@/repositories/billing/billing.repository', () => ({
  billingRepository: {
    completePaypalCheckout: (...args: unknown[]) => mockComplete(...args),
  },
}));

describe('usePaypalReturn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams.delete('session');
    searchParams.delete('state');
    searchParams.delete('token');
  });

  it('completes the bound checkout once and returns to billing', async () => {
    searchParams.set('session', 'checkout-1');
    searchParams.set('state', 'a'.repeat(64));
    searchParams.set('token', '5O190127TN364715T');
    mockComplete.mockResolvedValue({ id: 'checkout-1', status: 'COMPLETED' });

    const { result, rerender } = renderHook(() => usePaypalReturn());
    rerender();

    await waitFor(() => {
      expect(result.current.phase).toBe(BillingReturnPhase.SUCCESS);
    });
    expect(mockComplete).toHaveBeenCalledOnce();
    expect(mockComplete).toHaveBeenCalledWith('checkout-1', {
      providerOrderId: '5O190127TN364715T',
      state: 'a'.repeat(64),
    });
    expect(mockReplace).toHaveBeenCalledWith('/billing');
  });

  it('rejects a malformed return locally without calling the API', async () => {
    searchParams.set('session', 'checkout-1');
    searchParams.set('state', 'short');

    const { result } = renderHook(() => usePaypalReturn());

    await waitFor(() => {
      expect(result.current.phase).toBe(BillingReturnPhase.ERROR);
    });
    expect(mockComplete).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
