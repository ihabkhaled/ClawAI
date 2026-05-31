import { createElement, useCallback, useMemo, useRef, useState } from 'react';

import { VirtualizedMessageItem } from '@/components/chat/virtualized-message-item';
import { VirtualizedMessagesFooter } from '@/components/chat/virtualized-messages-footer';
import { VirtualizedMessagesHeader } from '@/components/chat/virtualized-messages-header';
import { VIRTUALIZED_MESSAGES_VIEWPORT_BUFFER } from '@/constants';
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

  const renderItems = useMemo<MessageRenderItem[]>(
    () => groupParallelMessages(params.messages),
    [params.messages],
  );
  const lastIndex = renderItems.length - 1;
  const lastMessage = params.messages.length > 0 ? params.messages.at(-1) : undefined;
  const lastMessageId = lastMessage?.id ?? null;
  const lastContentLength = lastMessage?.content?.length ?? 0;

  useFollowStreamingTokens({
    virtuosoRef,
    isAtBottom,
    lastMessageId,
    lastContentLength,
    lastIndex,
  });

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

  const { onStartReached, hasPreviousPage, isFetchingPreviousPage } = params;
  const handleStartReached = useCallback((): void => {
    if (hasPreviousPage && !isFetchingPreviousPage) {
      onStartReached();
    }
  }, [hasPreviousPage, isFetchingPreviousPage, onStartReached]);

  const { onFeedback, onRegenerate, t } = params;
  const itemContent = useCallback(
    (_index: number, item: MessageRenderItem): React.ReactElement =>
      createElement(VirtualizedMessageItem, { item, onFeedback, onRegenerate, t }),
    [onFeedback, onRegenerate, t],
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
    loadingLabel: params.loadingLabel,
    emptyLabel: params.emptyLabel,
    virtuosoRef,
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
    showJumpToLatest: !isAtBottom && params.isWaitingForResponse,
    onJumpToLatest: handleJumpToLatest,
    t: params.t,
  };
}
