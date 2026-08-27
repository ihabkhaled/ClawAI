import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useVirtualizedMessagesController } from '@/hooks/chat/use-virtualized-messages-controller';
import type { ChatMessage, UseVirtualizedMessagesControllerParams } from '@/types';
import type { TranslateFunction } from '@/types/i18n.types';

vi.mock('@/utilities', () => ({
  groupParallelMessages: (messages: ChatMessage[]) =>
    messages.map((m) => ({ kind: 'single' as const, message: m })),
}));

vi.mock('@/components/chat/virtualized-message-item', () => ({
  VirtualizedMessageItem: () => null,
}));
vi.mock('@/components/chat/virtualized-messages-header', () => ({
  VirtualizedMessagesHeader: () => null,
}));
vi.mock('@/components/chat/virtualized-messages-footer', () => ({
  VirtualizedMessagesFooter: () => null,
}));

const t: TranslateFunction = (key: string): string => key;

function makeMessage(id: string, content = 'hello'): ChatMessage {
  return {
    id,
    threadId: 'thread-1',
    role: 'ASSISTANT' as never,
    content,
    createdAt: new Date().toISOString(),
  } as unknown as ChatMessage;
}

function makeParams(
  overrides: Partial<UseVirtualizedMessagesControllerParams> = {},
): UseVirtualizedMessagesControllerParams {
  const defaults: UseVirtualizedMessagesControllerParams = {
    messages: [makeMessage('m1'), makeMessage('m2')],
    isLoading: false,
    isFetchingPreviousPage: false,
    hasPreviousPage: false,
    firstItemIndex: 0,
    isWaitingForResponse: false,
    fallbackAttempts: [],
    limitNotice: null,
    streamError: null,
    progressStages: [],
    currentStageLabel: null,
    onStartReached: vi.fn(),
    onFeedback: vi.fn(),
    onRegenerate: vi.fn(),
    loadingLabel: 'chat.loadingMessages',
    emptyLabel: 'chat.noMessagesYet',
    jumpToLatestLabelKey: 'chat.jumpToLatest',
    t,
  };
  return { ...defaults, ...overrides };
}

describe('useVirtualizedMessagesController', () => {
  it('produces the prop bag VirtualizedMessages consumes', () => {
    const { result } = renderHook(() => useVirtualizedMessagesController(makeParams()));
    expect(result.current.renderItems).toHaveLength(2);
    expect(result.current.itemContent).toBeTypeOf('function');
    expect(result.current.headerContent).toBeTypeOf('function');
    expect(result.current.footerContent).toBeTypeOf('function');
    expect(result.current.handleFollowOutput).toBeTypeOf('function');
    expect(result.current.handleStartReached).toBeTypeOf('function');
    expect(result.current.onAtBottomStateChange).toBeTypeOf('function');
    expect(result.current.virtuosoRef).toBeDefined();
    expect(result.current.initialTopMostItemIndex).toBe(1);
  });

  it('handleFollowOutput returns smooth at-bottom and false otherwise', () => {
    const { result } = renderHook(() => useVirtualizedMessagesController(makeParams()));
    expect(result.current.handleFollowOutput(true)).toBe('smooth');
    expect(result.current.handleFollowOutput(false)).toBe(false);
  });

  it('isEmpty derives from messages length', () => {
    const { result } = renderHook(() =>
      useVirtualizedMessagesController(makeParams({ messages: [] })),
    );
    expect(result.current.isEmpty).toBe(true);
  });

  it('showJumpToLatest fires whenever the user is not-at-bottom (waiting state no longer required)', () => {
    const { result } = renderHook(() =>
      useVirtualizedMessagesController(makeParams({ isWaitingForResponse: false })),
    );
    expect(result.current.showJumpToLatest).toBe(false);
    act(() => {
      result.current.onAtBottomStateChange(false);
    });
    // Even without an active stream, scrolling up should reveal the pill so
    // the user can return to the latest content quickly (Slack/Discord
    // parity — Phase 4 chat UI/UX refactor).
    expect(result.current.showJumpToLatest).toBe(true);
  });

  it('unreadCount stays 0 while at-bottom and increments only after scrolling away', () => {
    const { result, rerender } = renderHook(
      (params: UseVirtualizedMessagesControllerParams) => useVirtualizedMessagesController(params),
      { initialProps: makeParams() },
    );
    expect(result.current.unreadCount).toBe(0);

    // Scroll away from the bottom; no new messages yet, count stays 0.
    act(() => {
      result.current.onAtBottomStateChange(false);
    });
    expect(result.current.unreadCount).toBe(0);

    // A new assistant message arrives while the user is reading older
    // history. The badge should reflect 1 unread.
    rerender(makeParams({ messages: [makeMessage('m1'), makeMessage('m2'), makeMessage('m3')] }));
    expect(result.current.unreadCount).toBe(1);

    // Returning to the bottom clears the badge.
    act(() => {
      result.current.onAtBottomStateChange(true);
    });
    expect(result.current.unreadCount).toBe(0);
  });

  it('handleStartReached invokes onStartReached only when hasPreviousPage AND not fetching', () => {
    const onStartReached = vi.fn();
    const { result, rerender } = renderHook(
      (params: UseVirtualizedMessagesControllerParams) => useVirtualizedMessagesController(params),
      {
        initialProps: makeParams({
          onStartReached,
          hasPreviousPage: false,
          isFetchingPreviousPage: false,
        }),
      },
    );
    result.current.handleStartReached();
    expect(onStartReached).not.toHaveBeenCalled();

    rerender(makeParams({ onStartReached, hasPreviousPage: true, isFetchingPreviousPage: true }));
    result.current.handleStartReached();
    expect(onStartReached).not.toHaveBeenCalled();

    rerender(makeParams({ onStartReached, hasPreviousPage: true, isFetchingPreviousPage: false }));
    result.current.handleStartReached();
    expect(onStartReached).toHaveBeenCalledTimes(1);
  });
});
