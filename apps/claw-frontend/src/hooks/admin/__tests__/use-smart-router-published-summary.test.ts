import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSmartRouterPublishedSummary } from '@/hooks/admin/use-smart-router-published-summary';

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

describe('useSmartRouterPublishedSummary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the first (and only) published revision', async () => {
    mockList.mockResolvedValue({
      data: [{ id: 'rev-1', revision: 3, status: 'PUBLISHED' }],
      meta: { total: 1, page: 1, limit: 1, totalPages: 1 },
    });
    const { result } = renderHook(() => useSmartRouterPublishedSummary(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.published?.id).toBe('rev-1'));
    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PUBLISHED', limit: 1 }),
    );
  });

  it('returns null when nothing is published yet', async () => {
    mockList.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 1, totalPages: 0 } });
    const { result } = renderHook(() => useSmartRouterPublishedSummary(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.published).toBeNull();
  });

  it('surfaces query errors', async () => {
    mockList.mockRejectedValue(new Error('list-failed'));
    const { result } = renderHook(() => useSmartRouterPublishedSummary(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('list-failed');
  });
});
