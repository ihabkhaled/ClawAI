import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSharedConnectorsQuery } from '@/hooks/connector-grants/use-connector-grants';

const mockListConnectorsSharedWithMe = vi.fn();

vi.mock('@/repositories/workspace/connector-grant.repository', () => ({
  listConnectorsSharedWithMe: (...args: unknown[]) => mockListConnectorsSharedWithMe(...args),
  listConnectorGrants: vi.fn(),
  grantConnectorAccess: vi.fn(),
  revokeConnectorAccess: vi.fn(),
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useSharedConnectorsQuery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns shared connectors once loaded', async () => {
    mockListConnectorsSharedWithMe.mockResolvedValue([{ connectorId: 'c1' }]);
    const { result } = renderHook(() => useSharedConnectorsQuery(), { wrapper: makeWrapper() });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });

  it('surfaces query errors', async () => {
    mockListConnectorsSharedWithMe.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useSharedConnectorsQuery(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
