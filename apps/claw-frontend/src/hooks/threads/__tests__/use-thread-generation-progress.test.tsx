import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeProgress } from '@/components/threads/__tests__/thread-progress.fixture';
import {
  THREAD_PROGRESS_MAX_CONSECUTIVE_ERRORS,
  THREAD_PROGRESS_POLL_INTERVAL_MS,
} from '@/constants/thread-generation-progress.constants';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import { ApiClientError } from '@/services/shared/api-client';

import {
  threadProgressQueryKey,
  useThreadGenerationProgress,
} from '../use-thread-generation-progress';

vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: { getGenerationProgress: vi.fn() },
}));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('useThreadGenerationProgress', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('builds a stable query key', () => {
    expect(threadProgressQueryKey('p1')).toEqual([
      'thread-publications',
      'p1',
      'generation-progress',
    ]);
  });

  it('loads progress and does not poll a terminal job', async () => {
    vi.mocked(threadPublicationsRepository.getGenerationProgress).mockResolvedValue(makeProgress());
    const { wrapper } = setup();

    const { result } = renderHook(() => useThreadGenerationProgress('pub-1'), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.progress?.status).toBe('FAILED'));
    expect(result.current.error).toBeNull();
    expect(result.current.pollingPaused).toBe(false);
    expect(threadPublicationsRepository.getGenerationProgress).toHaveBeenCalledTimes(1);
  });

  it('turns a 404 into the not-found message and does not retry', async () => {
    vi.mocked(threadPublicationsRepository.getGenerationProgress).mockRejectedValue(
      new ApiClientError({ message: 'nope', status: 404 }),
    );
    const { wrapper } = setup();

    const { result } = renderHook(() => useThreadGenerationProgress('pub-1'), { wrapper });

    await waitFor(() =>
      expect(result.current.error).toEqual({ key: 'chat.threadProgress.error.notFound' }),
    );
    expect(result.current.progress).toBeUndefined();
    expect(threadPublicationsRepository.getGenerationProgress).toHaveBeenCalledTimes(1);
  });

  it('stays idle without a publication id', () => {
    const { wrapper } = setup();

    const { result } = renderHook(() => useThreadGenerationProgress(''), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(threadPublicationsRepository.getGenerationProgress).not.toHaveBeenCalled();
  });

  it('reports a paused poll once the budget is spent on a running job', async () => {
    vi.mocked(threadPublicationsRepository.getGenerationProgress).mockResolvedValue(
      makeProgress({ status: 'RUNNING', failure: null }),
    );
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useThreadGenerationProgress('pub-1'), { wrapper });
    await waitFor(() => expect(result.current.progress?.status).toBe('RUNNING'));
    expect(result.current.pollingPaused).toBe(false);

    const query = client.getQueryCache().find({ queryKey: threadProgressQueryKey('pub-1') });
    query?.setState({ dataUpdateCount: 400 });
    await act(async () => {
      await client.refetchQueries({ queryKey: threadProgressQueryKey('pub-1') });
    });

    await waitFor(() => expect(result.current.pollingPaused).toBe(true));
  });

  it('keeps polling after one transient error and recovers', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(threadPublicationsRepository.getGenerationProgress)
      .mockRejectedValueOnce(new ApiClientError({ message: 'blip', status: 500 }))
      .mockResolvedValue(makeProgress({ status: 'RUNNING', failure: null }));
    const { wrapper } = setup();

    const { result } = renderHook(() => useThreadGenerationProgress('pub-1'), { wrapper });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(THREAD_PROGRESS_POLL_INTERVAL_MS + 100);
    });
    await waitFor(() => expect(result.current.progress?.status).toBe('RUNNING'));
    expect(result.current.error).toBeNull();
    expect(result.current.pollingPaused).toBe(false);
    expect(threadPublicationsRepository.getGenerationProgress).toHaveBeenCalledTimes(2);
  });

  it('pauses with a reload hint after the consecutive-error cap', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(threadPublicationsRepository.getGenerationProgress).mockRejectedValue(
      new ApiClientError({ message: 'down', status: 503 }),
    );
    const { wrapper } = setup();

    const { result } = renderHook(() => useThreadGenerationProgress('pub-1'), { wrapper });

    for (let i = 0; i < THREAD_PROGRESS_MAX_CONSECUTIVE_ERRORS; i += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(THREAD_PROGRESS_POLL_INTERVAL_MS + 100);
      });
    }
    await waitFor(() => expect(result.current.pollingPausedByErrors).toBe(true));
    expect(result.current.pollingPaused).toBe(true);
    const calls = vi.mocked(threadPublicationsRepository.getGenerationProgress).mock.calls.length;
    expect(calls).toBe(THREAD_PROGRESS_MAX_CONSECUTIVE_ERRORS);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(THREAD_PROGRESS_POLL_INTERVAL_MS * 3);
    });
    expect(threadPublicationsRepository.getGenerationProgress).toHaveBeenCalledTimes(calls);
  });

  it('stops at once on a 403', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(threadPublicationsRepository.getGenerationProgress).mockRejectedValue(
      new ApiClientError({ message: 'no', status: 403 }),
    );
    const { wrapper } = setup();

    const { result } = renderHook(() => useThreadGenerationProgress('pub-1'), { wrapper });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(THREAD_PROGRESS_POLL_INTERVAL_MS * 3);
    });
    expect(threadPublicationsRepository.getGenerationProgress).toHaveBeenCalledTimes(1);
    expect(result.current.pollingPaused).toBe(false);
  });

  it('does not poll a COMPLETED job', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(threadPublicationsRepository.getGenerationProgress).mockResolvedValue(
      makeProgress({ status: 'COMPLETED', failure: null }),
    );
    const { wrapper } = setup();

    const { result } = renderHook(() => useThreadGenerationProgress('pub-1'), { wrapper });

    await waitFor(() => expect(result.current.progress?.status).toBe('COMPLETED'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(THREAD_PROGRESS_POLL_INTERVAL_MS * 3);
    });
    expect(threadPublicationsRepository.getGenerationProgress).toHaveBeenCalledTimes(1);
  });
});
