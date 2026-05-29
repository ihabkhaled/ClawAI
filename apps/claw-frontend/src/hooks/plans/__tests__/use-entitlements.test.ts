import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEntitlements } from '@/hooks/plans/use-entitlements';
import { useAuthStore } from '@/stores/auth.store';
import type { UserEntitlements } from '@/types';

const mockEntitlements = vi.fn();

vi.mock('@/repositories/auth/auth.repository', () => ({
  authRepository: {
    entitlements: (...args: unknown[]) => mockEntitlements(...args),
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

const sampleEntitlements = {
  userId: 'u1',
  role: 'VIEWER',
  isAdmin: false,
  permissions: ['CHAT_READ'],
  plan: { id: 'pl1', slug: 'free', name: 'Free', featureGates: {} },
  allowedModels: [],
  allowedProviders: ['ollama'],
  quota: { dailyLimit: 1000, used: 250, remaining: 750, unlimited: false },
} as unknown as UserEntitlements;

describe('useEntitlements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true });
  });

  it('does not query while unauthenticated', () => {
    useAuthStore.setState({ isAuthenticated: false });
    renderHook(() => useEntitlements(), { wrapper: makeWrapper() });
    expect(mockEntitlements).not.toHaveBeenCalled();
  });

  it('surfaces entitlements and maps the quota fields through', async () => {
    mockEntitlements.mockResolvedValue(sampleEntitlements);
    const { result } = renderHook(() => useEntitlements(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.entitlements).not.toBeNull();
    });
    expect(result.current.entitlements?.quota.dailyLimit).toBe(1000);
    expect(result.current.entitlements?.quota.used).toBe(250);
    expect(result.current.entitlements?.quota.remaining).toBe(750);
    expect(result.current.entitlements?.quota.unlimited).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('surfaces query errors', async () => {
    mockEntitlements.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useEntitlements(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.entitlements).toBeNull();
  });
});
