import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { type ReactElement, type ReactNode } from 'react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLocalModelsPage } from '@/hooks/ollama/use-local-models-page';

const mockGetRuntimes = vi.fn();
const mockGetHealth = vi.fn();

vi.mock('@/repositories/ollama/ollama.repository', () => ({
  ollamaRepository: {
    getRuntimes: (...args: unknown[]) => mockGetRuntimes(...args),
    getHealth: (...args: unknown[]) => mockGetHealth(...args),
  },
}));

vi.mock('@/hooks/ollama/use-local-models', () => ({
  useLocalModels: () => ({
    models: [],
    total: 0,
    isLoading: false,
    isError: false,
    error: null,
  }),
}));
vi.mock('@/hooks/ollama/use-pull-model', () => ({
  usePullModel: () => ({ pullModel: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/ollama/use-assign-role', () => ({
  useAssignRole: () => ({ assignRole: vi.fn(), isPending: false }),
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useLocalModelsPage optional-runtime polling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimes.mockRejectedValue(new Error('ollama-service unavailable'));
    mockGetHealth.mockRejectedValue(new Error('ollama-service unavailable'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stops polling health once the endpoint has permanently failed', async () => {
    vi.useFakeTimers();
    renderHook(() => useLocalModelsPage(), { wrapper: makeWrapper() });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mockGetHealth).toHaveBeenCalledTimes(1);

    // Advance well past several would-be 30s intervals.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });

    expect(mockGetHealth).toHaveBeenCalledTimes(1);
  });

  it('does not retry runtimes on a permanently failing endpoint', async () => {
    vi.useFakeTimers();
    renderHook(() => useLocalModelsPage(), { wrapper: makeWrapper() });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });

    expect(mockGetRuntimes).toHaveBeenCalledTimes(1);
  });
});
