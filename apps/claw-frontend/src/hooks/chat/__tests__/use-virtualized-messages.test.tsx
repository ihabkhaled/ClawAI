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

// Backend order is DESC (newest first).
const PAGE_1: MessagesListResponse = {
  data: [buildMessage('msg-4'), buildMessage('msg-3')],
  meta: { total: 4, page: 1, limit: 2, totalPages: 2 },
};
const PAGE_2: MessagesListResponse = {
  data: [buildMessage('msg-2'), buildMessage('msg-1')],
  meta: { total: 4, page: 2, limit: 2, totalPages: 2 },
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

  it('dedupes a message an offset-pagination window shift returned on two pages', async () => {
    // B8: page 1 and page 2 both carrying `msg-3` is exactly what a window
    // shift between the two requests produces. The duplicate must not reach
    // the rendered list twice.
    const overlappingPage2: MessagesListResponse = {
      data: [buildMessage('msg-3'), buildMessage('msg-2')],
      meta: { total: 4, page: 2, limit: 2, totalPages: 2 },
    };
    mockGetMessagesPaginated.mockImplementation((_threadId: string, page: number) =>
      Promise.resolve(page === 1 ? PAGE_1 : overlappingPage2),
    );

    const { result } = renderHook(() => useVirtualizedMessages('thread-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.fetchPreviousPage();
    });
    await waitFor(() => expect(result.current.hasPreviousPage).toBe(false));

    const ids = result.current.messages.map((message) => message.id);
    expect(ids).toEqual(['msg-2', 'msg-3', 'msg-4']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('polls only page 1 while awaiting a response, not every loaded page', async () => {
    // B9: the built-in `refetchInterval` refetches every loaded page on each
    // tick. Once page 2 is loaded, the awaiting-response poll must still cost
    // exactly one request — for page 1, where a new message actually lands.
    vi.useFakeTimers();
    try {
      mockGetMessagesPaginated.mockImplementation((_threadId: string, page: number) =>
        Promise.resolve(page === 1 ? PAGE_1 : PAGE_2),
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
        1,
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
