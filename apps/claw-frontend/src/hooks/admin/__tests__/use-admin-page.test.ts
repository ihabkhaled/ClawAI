import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminPage } from '@/hooks/admin/use-admin-page';

const mockGetAdminUsers = vi.fn();
const mockGetAggregatedHealth = vi.fn();
let mockUser: { role: string } | null = { role: 'ADMIN' };

vi.mock('@/hooks/auth/use-current-user', () => ({
  useCurrentUser: () => ({ user: mockUser, isLoading: false, isError: false, error: null }),
}));
vi.mock('@/repositories/audit/audit.repository', () => ({
  auditRepository: { getAdminUsers: (...args: unknown[]) => mockGetAdminUsers(...args) },
}));
vi.mock('@/repositories/health/health.repository', () => ({
  healthRepository: {
    getAggregatedHealth: (...args: unknown[]) => mockGetAggregatedHealth(...args),
  },
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const activeUser = {
  id: 'u1',
  email: 'a@b.com',
  username: 'alice',
  role: 'OPERATOR',
  status: 'ACTIVE',
  createdAt: '2026-05-01T00:00:00.000Z',
  activePlanId: null,
};

describe('useAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { role: 'ADMIN' };
    mockGetAdminUsers.mockResolvedValue({
      data: [activeUser, { ...activeUser, id: 'u2', status: 'SUSPENDED' }],
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
    });
    mockGetAggregatedHealth.mockResolvedValue({ status: 'HEALTHY', services: [] });
  });

  it('returns admin counts, translation, user, and health data', async () => {
    const { result } = renderHook(() => useAdminPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.totalUsers).toBe(2));
    await waitFor(() => expect(result.current.healthQuery.data).toBeDefined());
    expect(result.current.t('admin.title')).toBe('admin.title');
    expect(result.current.user).toEqual({ role: 'ADMIN' });
    expect(result.current.activeCount).toBe(1);
    expect(result.current.healthQuery.isError).toBe(false);
  });

  it('keeps queries disabled and returns defaults for a non-admin', () => {
    mockUser = { role: 'VIEWER' };
    const { result } = renderHook(() => useAdminPage(), { wrapper: makeWrapper() });
    expect(mockGetAdminUsers).not.toHaveBeenCalled();
    expect(mockGetAggregatedHealth).not.toHaveBeenCalled();
    expect(result.current.totalUsers).toBe(0);
    expect(result.current.activeCount).toBe(0);
    expect(result.current.healthQuery.data).toBeUndefined();
  });

  it('exposes a failed health query', async () => {
    mockGetAggregatedHealth.mockRejectedValue(new Error('health failed'));
    const { result } = renderHook(() => useAdminPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.healthQuery.isError).toBe(true));
    expect(result.current.healthQuery.isLoading).toBe(false);
  });
});
