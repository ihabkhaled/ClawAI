import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { type ReactElement, type ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePublicPricing } from '@/hooks/marketing/use-public-pricing';

const mockList = vi.fn();

vi.mock('@/hooks/marketing/use-pricing-toggle', () => ({
  usePricingToggle: () => ({
    isYearly: false,
    selectMonthly: vi.fn(),
    selectYearly: vi.fn(),
  }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string): string => key,
    locale: 'en',
  }),
}));

vi.mock('@/repositories/marketing/public-pricing.repository', () => ({
  publicPricingRepository: {
    list: (...args: unknown[]) => mockList(...args),
  },
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('usePublicPricing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
  });

  it('does not repeat a server-side catalog failure until the visitor retries', async () => {
    const { result } = renderHook(() => usePublicPricing(null), { wrapper: makeWrapper() });

    expect(result.current.isError).toBe(true);
    expect(mockList).not.toHaveBeenCalled();

    await act(async () => {
      result.current.retry();
    });

    expect(mockList).toHaveBeenCalledOnce();
  });
});
