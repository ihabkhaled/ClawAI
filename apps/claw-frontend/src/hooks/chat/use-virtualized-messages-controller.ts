import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { VirtualizedMessageItem } from '@/components/chat/virtualized-message-item';
import { VirtualizedMessagesFooter } from '@/components/chat/virtualized-messages-footer';
import { VirtualizedMessagesHeader } from '@/components/chat/virtualized-messages-header';
import { VIRTUALIZED_MESSAGES_VIEWPORT_BUFFER } from '@/constants';
import { MessageRole } from '@/enums';
import { useFollowStreamingTokens } from '@/hooks/chat/use-follow-streaming-tokens';
import type { FollowOutputCallback, VirtuosoHandle } from '@/lib/virtuoso';
import type {
  MessageRenderItem,
  UseVirtualizedMessagesControllerParams,
  UseVirtualizedMessagesControllerReturn,
} from '@/types';
import { groupParallelMessages } from '@/utilities';

// Controller hook for VirtualizedMessages. Owns the Virtuoso ref, the
// at-bottom state, and every render callback. Produces a flat prop bag the
// pure-render .tsx spreads onto <Virtuoso> + <JumpToLatestButton>, so the
// .tsx never calls a React hook. JSX is intentionally rendered via
// React.createElement so this stays a .ts file (no .tsx is allowed under
// src/hooks/ per repo convention).
export function useVirtualizedMessagesController(
  params: UseVirtualizedMessagesControllerParams,
): UseVirtualizedMessagesControllerReturn {
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  // Phase 4 (UI/UX refactor): Slack/Discord-style unread badge. We snapshot
  // the assistant-message count the moment the user scrolls away from the
  // bottom, then any subsequent assistant messages count as "unread" until
  // the user jumps back. Counted from `renderItems` (so a parallel group of
  // N lanes still increments the badge by 1).
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const lastSeenAssistantCountRef = useRef<number>(0);

  const renderItems = useMemo<MessageRenderItem[]>(
    () => groupParallelMessages(params.messages),
    [params.messages],
  );
  const lastIndex = renderItems.length - 1;
  const lastMessage = params.messages.length > 0 ? params.messages.at(-1) : undefined;
  const lastMessageId = lastMessage?.id ?? null;
  const lastContentLength = lastMessage?.content?.length ?? 0;

  // Total number of assistant-side render groups visible right now. Used as
  // the "high water mark" for the unread-count tracker; we never count user
  // messages because the user just sent them. Single items inspect the
  // wrapped message role; parallel groups are always assistant-side by
  // construction (parallel lanes are model responses).
  const assistantRenderCount = useMemo<number>(
    () =>
      renderItems.filter((item) =>
        item.kind === 'single' ? item.message.role !== MessageRole.USER : true,
      ).length,
    [renderItems],
  );

  useFollowStreamingTokens({
    virtuosoRef,
    isAtBottom,
    lastMessageId,
    lastContentLength,
    lastIndex,
  });

  // Reset the unread-water-mark whenever the user is back at the bottom so a
  // future scroll-away starts the count fresh.
  useEffect(() => {
    if (isAtBottom) {
      lastSeenAssistantCountRef.current = assistantRenderCount;
      setUnreadCount(0);
    }
  }, [isAtBottom, assistantRenderCount]);

  // Increment the badge when new assistant messages arrive while scrolled
  // up. Clamp to 0 so a backfill (older messages prepended) cannot produce
  // a negative count.
  useEffect(() => {
    if (isAtBottom) {
      return;
    }
    const delta = assistantRenderCount - lastSeenAssistantCountRef.current;
    setUnreadCount(delta > 0 ? delta : 0);
  }, [isAtBottom, assistantRenderCount]);

  const handleFollowOutput = useCallback<FollowOutputCallback>(
    (atBottom) => (atBottom ? 'smooth' : false),
    [],
  );

  const handleJumpToLatest = useCallback((): void => {
    if (lastIndex < 0) {
      return;
    }
    virtuosoRef.current?.scrollToIndex({
      index: lastIndex,
      behavior: 'smooth',
      align: 'end',
    });
  }, [lastIndex]);

  /**
   * Scrolls to a message by id, reporting whether it could.
   *
   * Search runs over the whole thread while this list holds one page of it, so
   * a real match can sit outside the loaded window. Jumping somewhere arbitrary
   * would be worse than not jumping — but the caller has to be able to tell the
   * difference, or the click just looks broken.
   */
  const handleJumpToMessage = useCallback(
    (messageId: string): boolean => {
      const index = params.messages.findIndex((message) => message.id === messageId);
      if (index < 0) {
        return false;
      }
      virtuosoRef.current?.scrollToIndex({ index, behavior: 'smooth', align: 'center' });
      return true;
    },
    [params.messages],
  );

  const { onStartReached, hasPreviousPage, isFetchingPreviousPage } = params;
  const handleStartReached = useCallback((): void => {
    if (hasPreviousPage && !isFetchingPreviousPage) {
      onStartReached();
    }
  }, [hasPreviousPage, isFetchingPreviousPage, onStartReached]);

  const { onFeedback, onRegenerate, onRerunStarted, t } = params;
  const itemContent = useCallback(
    (_index: number, item: MessageRenderItem): React.ReactElement =>
      createElement(VirtualizedMessageItem, { item, onFeedback, onRegenerate, onRerunStarted, t }),
    [onFeedback, onRegenerate, onRerunStarted, t],
  );

  const headerContent = useCallback(
    (): React.ReactElement =>
      createElement(VirtualizedMessagesHeader, {
        isFetchingPreviousPage: params.isFetchingPreviousPage,
        hasPreviousPage: params.hasPreviousPage,
        t: params.t,
      }),
    [params.isFetchingPreviousPage, params.hasPreviousPage, params.t],
  );

  const footerContent = useCallback(
    (): React.ReactElement =>
      createElement(VirtualizedMessagesFooter, {
        isWaitingForResponse: params.isWaitingForResponse,
        fallbackAttempts: params.fallbackAttempts,
        streamError: params.streamError,
        limitNotice: params.limitNotice,
        judgeEvaluating: params.judgeEvaluating,
        executingModel: params.executingModel,
        judgeModel: params.judgeModel,
        progressStages: params.progressStages,
        currentStageLabel: params.currentStageLabel,
        streamLive: params.streamLive,
        onCancelStream: params.onCancelStream,
        isCancellingStream: params.isCancellingStream,
      }),
    [
      params.isWaitingForResponse,
      params.fallbackAttempts,
      params.streamError,
      params.limitNotice,
      params.judgeEvaluating,
      params.executingModel,
      params.judgeModel,
      params.progressStages,
      params.currentStageLabel,
      params.streamLive,
      params.onCancelStream,
      params.isCancellingStream,
    ],
  );

  return {
    isLoading: params.isLoading,
    isEmpty: params.messages.length === 0,
    // Also handed to the list itself, not only to the footer: an empty thread
    // never renders a list, so the footer that normally carries the refusal is
    // never mounted.
    limitNotice: params.limitNotice,
    loadingLabel: params.loadingLabel,
    emptyLabel: params.emptyLabel,
    persistentError: params.streamError,
    virtuosoRef,
    handleJumpToMessage,
    renderItems,
    itemContent,
    headerContent,
    footerContent,
    handleFollowOutput,
    onAtBottomStateChange: setIsAtBottom,
    handleStartReached,
    initialTopMostItemIndex: Math.max(0, renderItems.length - 1),
    increaseViewportBy: VIRTUALIZED_MESSAGES_VIEWPORT_BUFFER,
    firstItemIndex: params.firstItemIndex,
    // Phase 4 (UI/UX refactor): show the pill whenever the user is scrolled
    // away from the bottom (matches Slack/Discord), regardless of whether
    // the assistant is mid-stream. The unread badge only renders when new
    // assistant content arrived during that scroll-up window.
    showJumpToLatest: !isAtBottom && renderItems.length > 0,
    onJumpToLatest: handleJumpToLatest,
    unreadCount,
    t: params.t,
  };
}
