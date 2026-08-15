import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RouterConfigurationStatus } from '@/enums/router-configuration.enum';
import { useSmartRouterRevisionsList } from '@/hooks/admin/use-smart-router-revisions-list';

const mockList = vi.fn();

vi.mock('@/repositories/admin/smart-router-admin.repository', () => ({
  smartRouterAdminRepository: { list: (...args: unknown[]) => mockList(...args) },
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useSmartRouterRevisionsList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists revisions with default pagination', async () => {
    mockList.mockResolvedValue({
      data: [{ id: 'rev-1', revision: 1 }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    const { result } = renderHook(() => useSmartRouterRevisionsList(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.revisions).toHaveLength(1));
    expect(result.current.page).toBe(1);
    expect(result.current.statusFilter).toBeUndefined();
  });

  it('setStatusFilter resets page to 1 and refetches with the status', async () => {
    mockList.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    const { result } = renderHook(() => useSmartRouterRevisionsList(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);

    act(() => result.current.setStatusFilter(RouterConfigurationStatus.DRAFT));
    expect(result.current.page).toBe(1);
    expect(result.current.statusFilter).toBe(RouterConfigurationStatus.DRAFT);
  });
});
