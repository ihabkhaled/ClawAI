import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type ReactElement, type ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BillingInterval } from '@/enums/billing.enum';
import { usePublicPricing } from '@/hooks/marketing/use-public-pricing';
import type { PublicPlan } from '@/types/public-pricing.types';

const mockList = vi.fn();

vi.mock('@/hooks/marketing/use-pricing-toggle', () => ({
  usePricingToggle: () => ({
    interval: BillingInterval.MONTHLY,
    selectInterval: vi.fn(),
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

function plan(slug: string): PublicPlan {
  return {
    id: slug,
    slug,
    name: slug,
    description: null,
    displayOrder: 0,
    isDefault: false,
    isPopular: false,
    isPublic: true,
    isActive: true,
    currency: 'USD',
    isTrial: false,
    trialDurationDays: null,
    dailyTokenQuota: 1000,
    weeklyTokenQuota: null,
    monthlyTokenQuota: null,
    paygCreditPercentBps: 3000,
    maxChatsPerDay: null,
    maxMessagesPerDay: null,
    maxWorkspaceConnections: null,
    maxContextPacks: null,
    maxMemoryItems: null,
    prices: [],
    features: [],
  };
}

describe('usePublicPricing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
  });

  it('serves the catalog it was given', async () => {
    const { result } = renderHook(() => usePublicPricing([plan('pro')]), {
      wrapper: makeWrapper(),
    });

    expect(result.current.plans.map((p) => p.slug)).toEqual(['pro']);
    expect(result.current.isError).toBe(false);
  });

  // The whole reason the hardcoded fallback was deleted: it rendered seven
  // invented prices, calmly, with isError hardcoded to false. A wrong price
  // shown confidently is a price a customer can hold us to.
  it('reports an error rather than inventing plans when the catalog cannot be read', async () => {
    mockList.mockRejectedValue(new Error('auth service unreachable'));

    const { result } = renderHook(() => usePublicPricing(null), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.plans).toEqual([]);
  });

  // "We have no public plans" and "we could not ask" need different words.
  it('keeps a genuinely empty catalog distinct from a failure', async () => {
    const { result } = renderHook(() => usePublicPricing([]), { wrapper: makeWrapper() });

    expect(result.current.plans).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  // Previously the client query only ran when the server fetch had succeeded,
  // so the one case that needed a retry was the one case retry could not fix.
  it('can re-fetch after a failed server render', async () => {
    renderHook(() => usePublicPricing(null), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });
  });
});
