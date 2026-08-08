import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { type ReactElement, type ReactNode } from 'react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDiscoveryRuns } from '@/hooks/discovery/use-discovery-runs';

const mockListRuns = vi.fn();

vi.mock('@/repositories/ollama/discovery.repository', () => ({
  discoveryRepository: {
    listRuns: (...args: unknown[]) => mockListRuns(...args),
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

describe('useDiscoveryRuns polling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stops polling once the runs query has settled into an error', async () => {
    mockListRuns.mockRejectedValue(new Error('ollama-service unavailable'));
    vi.useFakeTimers();
    const { result } = renderHook(() => useDiscoveryRuns(), { wrapper: makeWrapper() });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.isError).toBe(true);
    expect(mockListRuns).toHaveBeenCalledTimes(1);

    // Advance well past several would-be 5s/3s intervals -- discovery lives on
    // the optional ollama-service, so a permanent 502 must not be hammered forever.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(mockListRuns).toHaveBeenCalledTimes(1);
  });

  it('polls every 3s while a run is still in progress', async () => {
    mockListRuns.mockResolvedValue({
      data: [
        {
          id: 'run-1',
          sourceId: 'src-1',
          status: 'RUNNING',
          isDryRun: false,
          discoveredCount: 0,
          importedCount: 0,
          skippedCount: 0,
          failedCount: 0,
          errorMessage: null,
          triggeredBy: null,
          startedAt: new Date().toISOString(),
          completedAt: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    vi.useFakeTimers();
    renderHook(() => useDiscoveryRuns(), { wrapper: makeWrapper() });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mockListRuns).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(mockListRuns).toHaveBeenCalledTimes(2);
  });

  it('stops polling once no run is left in progress', async () => {
    mockListRuns.mockResolvedValue({
      data: [
        {
          id: 'run-1',
          sourceId: 'src-1',
          status: 'COMPLETED',
          isDryRun: false,
          discoveredCount: 5,
          importedCount: 5,
          skippedCount: 0,
          failedCount: 0,
          errorMessage: null,
          triggeredBy: null,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    vi.useFakeTimers();
    renderHook(() => useDiscoveryRuns(), { wrapper: makeWrapper() });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mockListRuns).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(mockListRuns).toHaveBeenCalledTimes(1);
  });
});
