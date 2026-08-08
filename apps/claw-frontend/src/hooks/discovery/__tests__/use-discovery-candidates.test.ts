import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { type ReactElement, type ReactNode } from 'react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDiscoveryCandidates } from '@/hooks/discovery/use-discovery-candidates';

const mockListCandidates = vi.fn();

vi.mock('@/repositories/ollama/discovery.repository', () => ({
  discoveryRepository: {
    listCandidates: (...args: unknown[]) => mockListCandidates(...args),
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

describe('useDiscoveryCandidates polling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListCandidates.mockRejectedValue(new Error('ollama-service unavailable'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stops polling once the candidates query has settled into an error', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDiscoveryCandidates(), { wrapper: makeWrapper() });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.isError).toBe(true);
    expect(mockListCandidates).toHaveBeenCalledTimes(1);

    // Advance well past several would-be 5s intervals -- discovery lives on the
    // optional ollama-service, so a permanent 502 must not be hammered forever.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(mockListCandidates).toHaveBeenCalledTimes(1);
  });

  it('keeps polling while the query has not yet settled into an error', async () => {
    vi.useFakeTimers();
    mockListCandidates.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20 });

    renderHook(() => useDiscoveryCandidates(), { wrapper: makeWrapper() });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mockListCandidates).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(mockListCandidates).toHaveBeenCalledTimes(2);
  });
});
