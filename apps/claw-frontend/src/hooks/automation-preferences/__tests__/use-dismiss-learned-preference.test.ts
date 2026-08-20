import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDismissLearnedPreference } from '@/hooks/automation-preferences/use-dismiss-learned-preference';

const mockToggleMemory = vi.fn();

vi.mock('@/repositories/memory/memory.repository', () => ({
  memoryRepository: {
    toggleMemory: (...args: unknown[]) => mockToggleMemory(...args),
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

describe('useDismissLearnedPreference', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls the repository toggle for the given id', async () => {
    mockToggleMemory.mockResolvedValue({ id: 'p1', isEnabled: false });
    const { result } = renderHook(() => useDismissLearnedPreference(), { wrapper: makeWrapper() });

    act(() => result.current.dismiss('p1'));

    await waitFor(() => expect(mockToggleMemory).toHaveBeenCalledWith('p1'));
  });

  it('tracks the pending id while the mutation is in flight', async () => {
    let resolvePromise!: (value: { id: string; isEnabled: boolean }) => void;
    mockToggleMemory.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );
    const { result } = renderHook(() => useDismissLearnedPreference(), { wrapper: makeWrapper() });

    act(() => result.current.dismiss('p1'));
    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.pendingId).toBe('p1');

    resolvePromise({ id: 'p1', isEnabled: false });
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});
