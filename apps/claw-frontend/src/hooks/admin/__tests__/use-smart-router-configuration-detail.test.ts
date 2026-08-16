import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSmartRouterConfigurationDetail } from '@/hooks/admin/use-smart-router-configuration-detail';

const mockGetById = vi.fn();

vi.mock('@/repositories/admin/smart-router-admin.repository', () => ({
  smartRouterAdminRepository: { getById: (...args: unknown[]) => mockGetById(...args) },
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useSmartRouterConfigurationDetail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches the revision by id when an id is given', async () => {
    mockGetById.mockResolvedValue({ id: 'rev-1', revision: 1, entries: [] });
    const { result } = renderHook(() => useSmartRouterConfigurationDetail('rev-1'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.configuration?.id).toBe('rev-1'));
    expect(mockGetById).toHaveBeenCalledWith('rev-1');
  });

  it('stays disabled and returns null when id is null', async () => {
    const { result } = renderHook(() => useSmartRouterConfigurationDetail(null), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.configuration).toBeNull();
    expect(mockGetById).not.toHaveBeenCalled();
  });
});
