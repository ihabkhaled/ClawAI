import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MESSAGE_POLL_INTERVAL_MS } from '@/constants';
import { MessageRole } from '@/enums';
import { useVirtualizedMessages } from '@/hooks/chat/use-virtualized-messages';
import type { ChatMessage, MessagesListResponse } from '@/types';

const { mockGetMessagesPaginated } = vi.hoisted(() => ({
  mockGetMessagesPaginated: vi.fn(),
}));

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: { getMessagesPaginated: mockGetMessagesPaginated },
}));

function buildMessage(id: string, overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id,
    threadId: 'thread-1',
    role: MessageRole.ASSISTANT,
    content: id,
    provider: null,
    model: null,
    routingMode: null,
    routerModel: null,
    usedFallback: false,
    inputTokens: null,
    outputTokens: null,
    feedback: null,
    latencyMs: null,
    metadata: null,
    createdAt: '2026-09-11T00:00:00.000Z',
    ...overrides,
  };
}

// Backend order is DESC (newest first). Cursor pagination: `before` is the id
// of a message already seen, not a page number — the newest page is fetched
// with no cursor at all.
const PAGE_1: MessagesListResponse = {
  data: [buildMessage('msg-3'), buildMessage('msg-2')],
  meta: { total: 3, limit: 2, nextBefore: 'msg-2' },
};
const PAGE_2: MessagesListResponse = {
  data: [buildMessage('msg-1')],
  meta: { total: 3, limit: 2, nextBefore: null },
};

describe('useVirtualizedMessages', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  function wrapper({ children }: { children: ReactNode }): ReactNode {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  it('dedupes a message id that somehow reaches two fetched pages', async () => {
    // Cursor pagination closes the routine cause of this (offset pagination's
    // window shifting when a row is inserted mid-fetch) by construction: a
    // page boundary is now a specific message's id, not a number that drifts.
    // The dedupe stays as defense-in-depth against a duplicate id reaching the
    // rendered list by any OTHER means, and this proves it still works.
    const pageWithDuplicate: MessagesListResponse = {
      data: [buildMessage('msg-2'), buildMessage('msg-1')],
      meta: { total: 3, limit: 2, nextBefore: null },
    };
    mockGetMessagesPaginated.mockImplementation((_threadId: string, before: string | undefined) =>
      Promise.resolve(before === undefined ? PAGE_1 : pageWithDuplicate),
    );

    const { result } = renderHook(() => useVirtualizedMessages('thread-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.fetchPreviousPage();
    });
    await waitFor(() => expect(result.current.hasPreviousPage).toBe(false));

    const ids = result.current.messages.map((message) => message.id);
    expect(ids).toEqual(['msg-1', 'msg-2', 'msg-3']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('requests the next OLDER page with the oldest loaded message as the cursor', async () => {
    mockGetMessagesPaginated.mockImplementation((_threadId: string, before: string | undefined) =>
      Promise.resolve(before === undefined ? PAGE_1 : PAGE_2),
    );

    const { result } = renderHook(() => useVirtualizedMessages('thread-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.fetchPreviousPage();
    });
    await waitFor(() => expect(result.current.hasPreviousPage).toBe(false));

    expect(mockGetMessagesPaginated).toHaveBeenNthCalledWith(
      2,
      'thread-1',
      'msg-2',
      expect.any(Number),
      expect.anything(),
    );
    expect(result.current.messages.map((message) => message.id)).toEqual([
      'msg-1',
      'msg-2',
      'msg-3',
    ]);
  });

  it('polls only the newest page while awaiting a response, not every loaded page', async () => {
    // B9: the built-in `refetchInterval` refetches every loaded page on each
    // tick. Once an older page is loaded, the awaiting-response poll must
    // still cost exactly one request — for the newest page (no cursor),
    // where a new message actually lands.
    vi.useFakeTimers();
    try {
      mockGetMessagesPaginated.mockImplementation((_threadId: string, before: string | undefined) =>
        Promise.resolve(before === undefined ? PAGE_1 : PAGE_2),
      );

      const { result, rerender } = renderHook(
        ({ isAwaitingResponse }: { isAwaitingResponse: boolean }) =>
          useVirtualizedMessages('thread-1', isAwaitingResponse),
        { wrapper, initialProps: { isAwaitingResponse: false } },
      );
      await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        result.current.fetchPreviousPage();
        await vi.runOnlyPendingTimersAsync();
      });
      await vi.waitFor(() => expect(result.current.hasPreviousPage).toBe(false));

      mockGetMessagesPaginated.mockClear();
      rerender({ isAwaitingResponse: true });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(MESSAGE_POLL_INTERVAL_MS);
      });

      expect(mockGetMessagesPaginated).toHaveBeenCalledTimes(1);
      expect(mockGetMessagesPaginated).toHaveBeenCalledWith(
        'thread-1',
        undefined,
        expect.any(Number),
        expect.anything(),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not poll while idle', async () => {
    vi.useFakeTimers();
    try {
      mockGetMessagesPaginated.mockResolvedValue(PAGE_1);
      const { result } = renderHook(() => useVirtualizedMessages('thread-1', false), { wrapper });
      await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

      mockGetMessagesPaginated.mockClear();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(MESSAGE_POLL_INTERVAL_MS * 3);
      });

      expect(mockGetMessagesPaginated).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('reflects the manual poll in isFetching', async () => {
    vi.useFakeTimers();
    try {
      mockGetMessagesPaginated.mockResolvedValue(PAGE_1);
      const { result, rerender } = renderHook(
        ({ isAwaitingResponse }: { isAwaitingResponse: boolean }) =>
          useVirtualizedMessages('thread-1', isAwaitingResponse),
        { wrapper, initialProps: { isAwaitingResponse: false } },
      );
      await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

      let resolvePoll: (() => void) | undefined;
      mockGetMessagesPaginated.mockImplementation(
        () =>
          new Promise<MessagesListResponse>((resolve) => {
            resolvePoll = () => resolve(PAGE_1);
          }),
      );
      rerender({ isAwaitingResponse: true });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(MESSAGE_POLL_INTERVAL_MS);
      });
      expect(result.current.isFetching).toBe(true);

      act(() => {
        resolvePoll?.();
      });
      await vi.waitFor(() => expect(result.current.isFetching).toBe(false));
    } finally {
      vi.useRealTimers();
    }
  });
});
