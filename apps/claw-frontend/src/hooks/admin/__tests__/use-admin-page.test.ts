import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminPage } from '@/hooks/admin/use-admin-page';

const mockGetAdminUsers = vi.fn();
const mockUpdateUserRole = vi.fn();
const mockDeactivateUser = vi.fn();
const mockGetAggregatedHealth = vi.fn();
const mockPlansList = vi.fn();
const mockAssignUser = vi.fn();
const mockShowToastSuccess = vi.fn();
const mockShowToastApiError = vi.fn();
const mockLoggerInfo = vi.fn();

let mockUser: { role: string } | null = { role: 'ADMIN' };

vi.mock('@/hooks/auth/use-current-user', () => ({
  useCurrentUser: () => ({ user: mockUser, isLoading: false, isError: false, error: null }),
}));

vi.mock('@/repositories/audit/audit.repository', () => ({
  auditRepository: {
    getAdminUsers: (...args: unknown[]) => mockGetAdminUsers(...args),
    updateUserRole: (...args: unknown[]) => mockUpdateUserRole(...args),
    deactivateUser: (...args: unknown[]) => mockDeactivateUser(...args),
  },
}));

vi.mock('@/repositories/health/health.repository', () => ({
  healthRepository: {
    getAggregatedHealth: (...args: unknown[]) => mockGetAggregatedHealth(...args),
  },
}));

vi.mock('@/repositories/admin/plans.repository', () => ({
  plansRepository: {
    list: (...args: unknown[]) => mockPlansList(...args),
    assignUser: (...args: unknown[]) => mockAssignUser(...args),
  },
}));

vi.mock('@/utilities', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    logger: {
      info: (...args: unknown[]) => mockLoggerInfo(...args),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    showToast: {
      success: (...args: unknown[]) => mockShowToastSuccess(...args),
      apiError: (...args: unknown[]) => mockShowToastApiError(...args),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
  };
});

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

function makeWrapper(): {
  wrapper: (props: { children: ReactNode }) => ReactElement;
  queryClient: QueryClient;
} {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
  return { wrapper, queryClient };
}

const sampleUser = {
  id: 'u1',
  email: 'a@b.com',
  username: 'alice',
  role: 'OPERATOR',
  status: 'ACTIVE',
  createdAt: '2026-05-01T00:00:00.000Z',
  activePlanId: null,
};

const samplePlan = {
  id: 'pl1',
  name: 'Pro',
  slug: 'pro',
  isActive: true,
};

describe('useAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { role: 'ADMIN' };
    mockGetAdminUsers.mockResolvedValue({
      data: [sampleUser],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    });
    mockGetAggregatedHealth.mockResolvedValue({ status: 'HEALTHY', services: [] });
    mockPlansList.mockResolvedValue([samplePlan]);
  });

  it('surfaces plans from the plans query', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminPage(), { wrapper });

    await waitFor(() => expect(result.current.plans).toHaveLength(1));
    expect(mockPlansList).toHaveBeenCalled();
    expect(result.current.plans[0]?.name).toBe('Pro');
  });

  it('does not enable queries for a non-admin user', async () => {
    mockUser = { role: 'VIEWER' };
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminPage(), { wrapper });

    await waitFor(() => expect(result.current.plans).toHaveLength(0));
    expect(mockPlansList).not.toHaveBeenCalled();
  });

  it('handleAssignPlan calls assignUser and invalidates the users query on success', async () => {
    mockAssignUser.mockResolvedValue(samplePlan);
    const { wrapper, queryClient } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useAdminPage(), { wrapper });

    await waitFor(() => expect(result.current.plans).toHaveLength(1));

    act(() => {
      result.current.handleAssignPlan('u1', 'pl1');
    });

    await waitFor(() => expect(mockShowToastSuccess).toHaveBeenCalled());
    expect(mockAssignUser).toHaveBeenCalledWith('u1', 'pl1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'users'] });
    expect(result.current.actionPending).toBeNull();
  });

  it('handleAssignPlan surfaces an apiError toast on failure', async () => {
    mockAssignUser.mockRejectedValue(new Error('assign-failed'));
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminPage(), { wrapper });

    await waitFor(() => expect(result.current.plans).toHaveLength(1));

    act(() => {
      result.current.handleAssignPlan('u1', 'pl1');
    });

    await waitFor(() => expect(mockShowToastApiError).toHaveBeenCalled());
    expect(result.current.actionPending).toBeNull();
    expect(result.current.isAssignPlanPending).toBe(false);
  });

  it('sets actionPending to the userId while a plan assignment is in flight', async () => {
    let resolveAssign: (value: unknown) => void = () => undefined;
    mockAssignUser.mockReturnValue(
      new Promise((resolve) => {
        resolveAssign = resolve;
      }),
    );
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminPage(), { wrapper });

    await waitFor(() => expect(result.current.plans).toHaveLength(1));

    act(() => {
      result.current.handleAssignPlan('u1', 'pl1');
    });

    await waitFor(() => expect(result.current.actionPending).toBe('u1'));
    expect(result.current.isAssignPlanPending).toBe(true);

    act(() => {
      resolveAssign(samplePlan);
    });
    await waitFor(() => expect(result.current.actionPending).toBeNull());
  });
});
