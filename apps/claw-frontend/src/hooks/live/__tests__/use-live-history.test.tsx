import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LiveMode, LiveSessionState, LiveSourceKind } from '@/enums/live.enum';
import { useLiveHistory } from '@/hooks/live/use-live-history';
import type { LiveHistoryItem } from '@/types/live.types';

const mockList = vi.fn();

vi.mock('@/repositories/live/live.repository', () => ({
  liveRepository: { listHistory: (...args: unknown[]) => mockList(...args) },
}));

function item(id: string): LiveHistoryItem {
  return {
    id,
    runId: `r-${id}`,
    streamId: `st-${id}`,
    title: null,
    sourceKind: LiveSourceKind.HLS,
    sourceUrl: `https://example.com/${id}.m3u8`,
    mode: LiveMode.AUDIO,
    language: 'en',
    state: LiveSessionState.DETACHED,
    startedAt: '2026-11-22T10:00:00.000Z',
    detachedAt: null,
    billedSeconds: 120,
  };
}

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useLiveHistory', () => {
  beforeEach(() => {
    mockList.mockReset();
  });

  it('loads the first page without a cursor and the next one with nextCursor', async () => {
    mockList
      .mockResolvedValueOnce({ items: [item('a'), item('b')], nextCursor: 'c1' })
      .mockResolvedValueOnce({ items: [item('c')], nextCursor: null });
    const { result } = renderHook(() => useLiveHistory(), { wrapper });

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(mockList.mock.calls[0]?.[0]).toBeNull();
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    await waitFor(() =>
      expect(result.current.items.map((entry) => entry.id)).toEqual(['a', 'b', 'c']),
    );
    expect(mockList.mock.calls[1]?.[0]).toBe('c1');
    expect(result.current.hasMore).toBe(false);
  });

  it('reports an empty history as empty, not as an error', async () => {
    mockList.mockResolvedValueOnce({ items: [], nextCursor: null });
    const { result } = renderHook(() => useLiveHistory(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it('reports a failed load as an error', async () => {
    mockList.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useLiveHistory(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
