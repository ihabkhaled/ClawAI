import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { threadBoardRepository } from '@/repositories/threads/thread-board.repository';
import type { ThreadBoardSuggestResponse } from '@/types/thread-board.types';

import { useBoardSuggest } from '../use-board-suggest';

vi.mock('@/repositories/threads/thread-board.repository', () => ({
  threadBoardRepository: { suggest: vi.fn(), list: vi.fn() },
}));

const RESPONSE: ThreadBoardSuggestResponse = {
  suggestions: [],
  didYouMean: 'rag',
  total: 4,
  totalCapped: false,
};

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(threadBoardRepository.suggest).mockResolvedValue(RESPONSE);
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useBoardSuggest', () => {
  it('does not fetch below 2 characters', async () => {
    const { result } = renderHook(() => useBoardSuggest('a', 'en'), { wrapper: wrapper() });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(threadBoardRepository.suggest).not.toHaveBeenCalled();
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('debounces 200 ms and fetches once for the final value', async () => {
    const { rerender } = renderHook(({ q }) => useBoardSuggest(q, 'all'), {
      wrapper: wrapper(),
      initialProps: { q: 'x' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    rerender({ q: 'rag' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    rerender({ q: 'rags' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(199);
    });
    expect(threadBoardRepository.suggest).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(threadBoardRepository.suggest).toHaveBeenCalledTimes(1);
    expect(vi.mocked(threadBoardRepository.suggest).mock.calls[0]?.slice(0, 2)).toEqual([
      'rags',
      'all',
    ]);
  });

  it('exposes the response fields and passes an abort signal', async () => {
    const { result } = renderHook(() => useBoardSuggest('rag', 'all'), { wrapper: wrapper() });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(result.current.didYouMean).toBe('rag');
    expect(result.current.total).toBe(4);
    const options = vi.mocked(threadBoardRepository.suggest).mock.calls[0]?.[2];
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it('reports isError when the request fails', async () => {
    vi.mocked(threadBoardRepository.suggest).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useBoardSuggest('rag', 'all'), { wrapper: wrapper() });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(result.current.isError).toBe(true);
  });

  it('clamps the request to 100 characters so the API never answers 400', async () => {
    renderHook(() => useBoardSuggest('x'.repeat(130), 'all'), { wrapper: wrapper() });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(vi.mocked(threadBoardRepository.suggest).mock.calls[0]?.[0]).toBe('x'.repeat(100));
  });
});
