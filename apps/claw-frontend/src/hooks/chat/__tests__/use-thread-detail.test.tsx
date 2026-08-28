import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MessageRole, RoutingMode } from '@/enums';
import { useThreadDetail } from '@/hooks/chat/use-thread-detail';
import type { ChatMessage } from '@/types';

const { mockGetThread, mockResetStream, streamState, virtualizedState } = vi.hoisted(() => ({
  mockGetThread: vi.fn(),
  mockResetStream: vi.fn(),
  streamState: { completedAt: null as number | null, completionReads: 0 },
  virtualizedState: { messages: [] as ChatMessage[] },
}));

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: { getThread: mockGetThread },
}));

vi.mock('@/hooks/chat/use-chat-stream', () => ({
  useChatStream: (_threadId: string, isActive: boolean) => ({
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
  }),
}));

vi.mock('@/hooks/chat/use-virtualized-messages', () => ({
  useVirtualizedMessages: () => ({
    messages: virtualizedState.messages,
    isLoading: false,
    isFetchingPreviousPage: false,
    isFetchingNextPage: false,
    hasPreviousPage: false,
    hasNextPage: false,
    fetchPreviousPage: vi.fn(),
    fetchNextPage: vi.fn(),
    totalCount: virtualizedState.messages.length,
    firstItemIndex: 0,
  }),
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
    virtualizedState.messages = [buildUserMessage()];
    mockGetThread.mockResolvedValue(null);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
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
