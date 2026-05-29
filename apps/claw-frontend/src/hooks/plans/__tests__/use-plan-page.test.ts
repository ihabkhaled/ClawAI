import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlanPage } from '@/hooks/plans/use-plan-page';
import { useAuthStore } from '@/stores/auth.store';
import type { UserEntitlements } from '@/types';

const mockEntitlements = vi.fn();

vi.mock('@/repositories/auth/auth.repository', () => ({
  authRepository: {
    entitlements: (...args: unknown[]) => mockEntitlements(...args),
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const sampleEntitlements = {
  userId: 'u1',
  role: 'OPERATOR',
  isAdmin: false,
  permissions: [],
  plan: { id: 'pl1', slug: 'pro', name: 'Pro', featureGates: {} },
  allowedModels: [],
  allowedProviders: ['openai'],
  quota: { dailyLimit: 0, used: 0, remaining: 0, unlimited: true },
} as unknown as UserEntitlements;

describe('usePlanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true });
  });

  it('exposes the translate function and surfaces the entitlements plan', async () => {
    mockEntitlements.mockResolvedValue(sampleEntitlements);
    const { result } = renderHook(() => usePlanPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.entitlements).not.toBeNull();
    });
    expect(typeof result.current.t).toBe('function');
    expect(result.current.entitlements?.plan?.slug).toBe('pro');
    expect(result.current.entitlements?.quota.unlimited).toBe(true);
  });

  it('surfaces query errors and exposes onRetry', async () => {
    mockEntitlements.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => usePlanPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe('boom');
    expect(typeof result.current.onRetry).toBe('function');
  });
});
