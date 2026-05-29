import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUsagePage } from '@/hooks/plans/use-usage-page';
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
  role: 'VIEWER',
  isAdmin: false,
  permissions: [],
  plan: null,
  allowedModels: [],
  allowedProviders: [],
  quota: { dailyLimit: 5000, used: 1000, remaining: 4000, unlimited: false },
} as unknown as UserEntitlements;

describe('useUsagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true });
  });

  it('exposes the translate function alongside entitlements', async () => {
    mockEntitlements.mockResolvedValue(sampleEntitlements);
    const { result } = renderHook(() => useUsagePage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.entitlements).not.toBeNull();
    });
    expect(typeof result.current.t).toBe('function');
    expect(result.current.t('any.key')).toBe('any.key');
  });

  it('maps the quota fields through from the underlying entitlements query', async () => {
    mockEntitlements.mockResolvedValue(sampleEntitlements);
    const { result } = renderHook(() => useUsagePage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.entitlements).not.toBeNull();
    });
    expect(result.current.entitlements?.quota.dailyLimit).toBe(5000);
    expect(result.current.entitlements?.quota.used).toBe(1000);
    expect(result.current.entitlements?.quota.remaining).toBe(4000);
  });

  it('surfaces query errors', async () => {
    mockEntitlements.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useUsagePage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe('boom');
  });
});
