import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSmartRouterDraftSummary } from '@/hooks/admin/use-smart-router-draft-summary';

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

describe('useSmartRouterDraftSummary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the newest draft revision', async () => {
    mockList.mockResolvedValue({
      data: [{ id: 'rev-4', revision: 4, status: 'DRAFT' }],
      meta: { total: 1, page: 1, limit: 1, totalPages: 1 },
    });
    const { result } = renderHook(() => useSmartRouterDraftSummary(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.draft?.id).toBe('rev-4'));
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ status: 'DRAFT', limit: 1 }));
  });

  it('returns null when no draft exists', async () => {
    mockList.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 1, totalPages: 0 } });
    const { result } = renderHook(() => useSmartRouterDraftSummary(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.draft).toBeNull();
  });
});
