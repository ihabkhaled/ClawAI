import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BillingGateway, BillingInterval } from '@/enums/billing.enum';
import { useStartCheckout } from '@/hooks/billing/use-start-checkout';

const mocks = vi.hoisted(() => ({
  createCheckoutSession: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/repositories/billing/billing.repository', () => ({
  billingRepository: {
    createCheckoutSession: (...args: unknown[]) => mocks.createCheckoutSession(...args),
  },
}));
vi.mock('@/utilities/toast.utility', () => ({ showToast: { error: vi.fn() } }));

function makeWrapper(): React.ComponentType<PropsWithChildren> {
  const client = new QueryClient();
  return function Wrapper({ children }: PropsWithChildren): React.ReactElement {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useStartCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000000',
    );
    mocks.createCheckoutSession.mockResolvedValue({ hostedCheckoutUrl: null });
  });

  it('uses one idempotency key and ignores a duplicate submit while the attempt is active', async () => {
    const { result } = renderHook(() => useStartCheckout(), { wrapper: makeWrapper() });
    const input = {
      planId: 'plan-pro',
      billingInterval: BillingInterval.YEARLY,
      gateway: BillingGateway.PAYPAL,
    };

    act(() => {
      result.current.startCheckout(input);
      result.current.startCheckout(input);
    });

    await waitFor(() => expect(mocks.createCheckoutSession).toHaveBeenCalledTimes(1));
    expect(mocks.createCheckoutSession).toHaveBeenCalledWith({
      ...input,
      idempotencyKey: '00000000-0000-4000-8000-000000000000',
    });
  });
});
