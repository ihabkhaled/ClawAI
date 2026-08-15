import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSmartRouterPublish } from '@/hooks/admin/use-smart-router-publish';

const mockPublish = vi.fn();

vi.mock('@/repositories/admin/smart-router-admin.repository', () => ({
  smartRouterAdminRepository: { publish: (...args: unknown[]) => mockPublish(...args) },
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useSmartRouterPublish', () => {
  beforeEach(() => vi.clearAllMocks());

  it('publishes the given revision id', async () => {
    mockPublish.mockResolvedValue({ id: 'rev-1', status: 'PUBLISHED' });
    const { result } = renderHook(() => useSmartRouterPublish(), { wrapper: makeWrapper() });

    act(() => result.current.publish('rev-1'));

    await waitFor(() => expect(mockPublish).toHaveBeenCalledWith('rev-1'));
  });
});
