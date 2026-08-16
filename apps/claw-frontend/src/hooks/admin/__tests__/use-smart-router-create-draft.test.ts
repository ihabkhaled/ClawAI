import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSmartRouterCreateDraft } from '@/hooks/admin/use-smart-router-create-draft';

const mockCreateDraft = vi.fn();

vi.mock('@/repositories/admin/smart-router-admin.repository', () => ({
  smartRouterAdminRepository: { createDraft: (...args: unknown[]) => mockCreateDraft(...args) },
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useSmartRouterCreateDraft', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a draft for the global scope', async () => {
    mockCreateDraft.mockResolvedValue({ id: 'rev-new', status: 'DRAFT' });
    const { result } = renderHook(() => useSmartRouterCreateDraft(), { wrapper: makeWrapper() });

    act(() => result.current.createDraft());

    await waitFor(() => expect(mockCreateDraft).toHaveBeenCalledWith({ scope: 'GLOBAL' }));
  });

  it('exposes isPending while the mutation is in flight', async () => {
    let resolvePromise: (value: unknown) => void = () => {};
    mockCreateDraft.mockReturnValue(new Promise((resolve) => (resolvePromise = resolve)));
    const { result } = renderHook(() => useSmartRouterCreateDraft(), { wrapper: makeWrapper() });

    act(() => result.current.createDraft());
    await waitFor(() => expect(result.current.isPending).toBe(true));

    resolvePromise({ id: 'rev-new' });
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});
