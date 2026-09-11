import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RESPONSE_WAIT_TIMEOUT_MS } from '@/constants';
import { MessageRole, RoutingMode } from '@/enums';
import { useThreadDetail } from '@/hooks/chat/use-thread-detail';
import type { ChatMessage } from '@/types';

const { mockGetThread, mockResetStream, streamState, virtualizedState } = vi.hoisted(() => ({
  mockGetThread: vi.fn(),
  mockResetStream: vi.fn(),
  streamState: {
    completedAt: null as number | null,
    completionReads: 0,
    lastReplayArg: undefined as boolean | undefined,
  },
  virtualizedState: {
    messages: [] as ChatMessage[],
    isFetching: false,
    isAwaitingResponseArgs: [] as boolean[],
  },
}));

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: { getThread: mockGetThread },
}));

vi.mock('@/hooks/chat/use-chat-stream', () => ({
  useChatStream: (_threadId: string, isActive: boolean, replayPastEvents?: boolean) => {
    streamState.lastReplayArg = replayPastEvents;
    return {
      fallbackAttempts: [],
      streamCompletedAt:
        isActive && streamState.completionReads++ === 0 ? streamState.completedAt : null,
      streamError: null,
      judgeEvaluating: false,
      executingModel: null,
      judgeModel: null,
      progressStages: [],
      currentStageLabel: null,
      streamLive: { content: '', reasoning: '', isStreaming: false },
      resetStream: mockResetStream,
    };
  },
}));

vi.mock('@/hooks/chat/use-virtualized-messages', () => ({
  useVirtualizedMessages: (_threadId: string, isAwaitingResponse: boolean) => {
    virtualizedState.isAwaitingResponseArgs.push(isAwaitingResponse);
    return {
      messages: virtualizedState.messages,
      isLoading: false,
      isFetching: virtualizedState.isFetching,
      isFetchingPreviousPage: false,
      isFetchingNextPage: false,
      hasPreviousPage: false,
      hasNextPage: false,
      fetchPreviousPage: vi.fn(),
      fetchNextPage: vi.fn(),
      totalCount: virtualizedState.messages.length,
      firstItemIndex: 0,
    };
  },
}));

function buildUserMessage(): ChatMessage {
  return {
    id: 'message-user',
    threadId: 'thread-race',
    role: MessageRole.USER,
    content: 'hello',
    provider: null,
    model: null,
    routingMode: RoutingMode.AUTO,
    routerModel: null,
    usedFallback: false,
    inputTokens: null,
    outputTokens: null,
    feedback: null,
    latencyMs: null,
    metadata: null,
    createdAt: '2026-08-12T18:43:53.000Z',
  };
}

function buildMessage(id: string, role: MessageRole): ChatMessage {
  return { ...buildUserMessage(), id, role };
}

describe('useThreadDetail', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    streamState.completedAt = null;
    streamState.completionReads = 0;
    streamState.lastReplayArg = undefined;
    virtualizedState.messages = [buildUserMessage()];
    virtualizedState.isFetching = false;
    virtualizedState.isAwaitingResponseArgs = [];
    mockGetThread.mockResolvedValue(null);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('does not arm recovery from a transcript that is being replaced', async () => {
    // Immediately after a run completes the list is invalidated and still ends
    // with the USER message until the refetch lands. Arming there opened a
    // second, pointless stream connection for every single send.
    virtualizedState.isFetching = true;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useThreadDetail('thread-race'), { wrapper });

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(result.current.isWaitingForResponse).toBe(false);
  });

  it('asks for replay when recovering a run that was already in flight', async () => {
    // A page load finding a transcript that ends in an unanswered question.
    // This run started before the page did, so replay is the only way to catch
    // up on what was missed.
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useThreadDetail('thread-race'), { wrapper });

    await waitFor(() => expect(result.current.isWaitingForResponse).toBe(true));

    expect(streamState.lastReplayArg).toBe(true);
  });

  it('does NOT ask for replay for a run this page just started', async () => {
    // The race that produced "200 then net::ERR_ABORTED, repeatedly": the
    // stream opens before the POST clears the server's replay buffer, so a
    // replaying connection is handed the PREVIOUS run's terminal DONE, treats
    // it as completion, and aborts the connection it just opened. A freshly
    // sent run has missed nothing, so it asks for nothing.
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    virtualizedState.messages = [buildMessage('assistant-1', MessageRole.ASSISTANT)];
    const { result } = renderHook(() => useThreadDetail('thread-race'), { wrapper });

    await waitFor(() => expect(result.current.isWaitingForResponse).toBe(false));

    act(() => {
      result.current.startWaitingForResponse();
    });

    await waitFor(() => expect(result.current.isWaitingForResponse).toBe(true));
    expect(streamState.lastReplayArg).toBe(false);
  });

  it('does not re-download the conversation on a timer while waiting', async () => {
    // The measured defect: a 2-second setInterval invalidated the whole
    // conversation for up to ten minutes, so an abandoned run cost 30
    // full-thread requests per minute on a page nobody was touching. The
    // refetch while a response is in flight belongs to the query that owns the
    // data; this hook only bounds how long the wait lasts.
    vi.useFakeTimers();
    try {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useThreadDetail('thread-race'), { wrapper });

      await vi.waitFor(() => {
        expect(result.current.isWaitingForResponse).toBe(true);
      });
      invalidateSpy.mockClear();

      // Thirty seconds is fifteen ticks of the old interval.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });

      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(result.current.isWaitingForResponse).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops waiting once the response deadline passes', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
      const { result } = renderHook(() => useThreadDetail('thread-race'), { wrapper });

      await vi.waitFor(() => {
        expect(result.current.isWaitingForResponse).toBe(true);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(RESPONSE_WAIT_TIMEOUT_MS + 1000);
      });

      expect(result.current.isWaitingForResponse).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not restart waiting after DONE while the message cache still ends with USER', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(() => useThreadDetail('thread-race'), { wrapper });

    await waitFor(() => expect(result.current.isWaitingForResponse).toBe(true));

    act(() => {
      streamState.completedAt = 1;
      streamState.completionReads = 0;
      rerender();
    });

    await waitFor(() => expect(result.current.isWaitingForResponse).toBe(false));
  });

  it('disarms the messages poll in the SAME render DONE arrives, not one render later', async () => {
    // `isWaitingForResponse` only flips to false in the effect that runs AFTER
    // this render commits, so on its own it leaves the poll's interval armed
    // for one extra render — a window where a periodic tick landing at the
    // same moment as DONE's own invalidation can produce two near-identical
    // refetches for one completed answer. Folding `streamCompletedAt` into the
    // flag passed to useVirtualizedMessages closes that window a render early.
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(() => useThreadDetail('thread-race'), { wrapper });

    await waitFor(() => expect(result.current.isWaitingForResponse).toBe(true));
    // Still waiting: the poll must still be armed.
    expect(virtualizedState.isAwaitingResponseArgs.at(-1)).toBe(true);

    act(() => {
      streamState.completedAt = 1;
      streamState.completionReads = 0;
      rerender();
    });

    // This assertion is the point: at the very first render where
    // streamCompletedAt is non-null, isWaitingForResponse (React state) has
    // NOT yet flipped to false — the effect that does that runs after this
    // render commits. The poll flag must be false anyway.
    expect(virtualizedState.isAwaitingResponseArgs.at(-1)).toBe(false);

    await waitFor(() => expect(result.current.isWaitingForResponse).toBe(false));
  });

  it('re-arms waiting when an edit truncates the thread after a completed run', async () => {
    // The reported "the answer doesn't show until I refresh". Editing a prompt
    // re-runs the thread from it, but nothing tells this hook a run started, so
    // the recovery effect is the only thing that could notice — and it was
    // blocked by a flag set by the PREVIOUS run and never scoped to it. With no
    // waiting state there is no SSE subscription and no polling, so the answer
    // sits in the database until a remount happens to fetch it.
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    virtualizedState.messages = [
      buildMessage('user-1', MessageRole.USER),
      buildMessage('assistant-1', MessageRole.ASSISTANT),
      buildMessage('user-2', MessageRole.USER),
    ];
    const { result, rerender } = renderHook(() => useThreadDetail('thread-race'), { wrapper });

    // The transcript ends with an unanswered question, so waiting arms itself.
    await waitFor(() => expect(result.current.isWaitingForResponse).toBe(true));

    // DONE concludes that run. This is what records the suppression.
    act(() => {
      streamState.completedAt = 1;
      streamState.completionReads = 0;
      rerender();
    });
    await waitFor(() => expect(result.current.isWaitingForResponse).toBe(false));

    // Its answer arrives, so the transcript ends with the assistant.
    act(() => {
      streamState.completedAt = null;
      streamState.completionReads = 0;
      virtualizedState.messages = [
        buildMessage('user-1', MessageRole.USER),
        buildMessage('assistant-1', MessageRole.ASSISTANT),
        buildMessage('user-2', MessageRole.USER),
        buildMessage('assistant-2', MessageRole.ASSISTANT),
      ];
      rerender();
    });

    // Editing the first prompt deletes every answer below it, so the transcript
    // ends with an unanswered question again — a different one.
    act(() => {
      virtualizedState.messages = [buildMessage('user-1', MessageRole.USER)];
      rerender();
    });

    await waitFor(() => expect(result.current.isWaitingForResponse).toBe(true));
  });
});
