'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';

import { JumpToLatestButton } from '@/components/chat/jump-to-latest-button';
import { MessageBubble } from '@/components/chat/message-bubble';
import { ParallelMessageGroup } from '@/components/chat/parallel-message-group';
import { ThinkingIndicator } from '@/components/chat/thinking-indicator';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { useStickyBottomScroll } from '@/hooks/chat/use-sticky-bottom-scroll';
import type { MessageRenderItem, VirtualizedMessagesProps } from '@/types';
import { groupParallelMessages } from '@/utilities';

export function VirtualizedMessages({
  messages,
  isLoading,
  isFetchingPreviousPage,
  hasPreviousPage,
  firstItemIndex,
  isWaitingForResponse,
  fallbackAttempts,
  streamError,
  judgeEvaluating,
  executingModel,
  judgeModel,
  progressStages,
  currentStageLabel,
  streamLive,
  onCancelStream,
  isCancellingStream,
  t,
  onStartReached,
  onFeedback,
  onRegenerate,
}: VirtualizedMessagesProps): React.ReactElement {
  const renderItems = groupParallelMessages(messages);

  // Sticky-bottom auto-scroll: feed the hook a signal that changes every
  // time content grows (message count + live streaming text length). The
  // hook handles the rest — observes scroll position + sentinel + parent
  // height, only auto-scrolls when the user is already near the bottom.
  const contentSignal = useMemo(
    () => `${String(messages.length)}:${String(streamLive?.content.length ?? 0)}:${String(streamLive?.reasoning.length ?? 0)}:${String(progressStages.length)}`,
    [messages.length, streamLive?.content.length, streamLive?.reasoning.length, progressStages.length],
  );
  const { scrollRef, sentinelRef, isAtBottom, scrollToBottom } = useStickyBottomScroll({
    contentSignal,
  });

  const handleScrollerRef = useCallback(
    (ref: HTMLElement | Window | null): void => {
      // Virtuoso 4 passes Window only for window-scroller mode; we use the
      // default in-container scroller so the ref is always an HTMLElement.
      if (ref instanceof HTMLElement) {
        scrollRef.current = ref as HTMLDivElement;
      } else {
        scrollRef.current = null;
      }
    },
    [scrollRef],
  );

  const handleJumpToLatest = useCallback((): void => {
    scrollToBottom('smooth');
  }, [scrollToBottom]);

  const itemContent = useCallback(
    (_index: number, item: unknown): React.ReactElement => {
      const renderItem = item as MessageRenderItem;
      if (!renderItem) {
        return <div />;
      }
      if (renderItem.kind === 'parallel') {
        return (
          <div className="px-4 py-2">
            <ParallelMessageGroup messages={renderItem.messages} t={t} />
          </div>
        );
      }
      return (
        <div className="px-4 py-2">
          <MessageBubble
            message={renderItem.message}
            onFeedback={onFeedback}
            onRegenerate={onRegenerate}
          />
        </div>
      );
    },
    [onFeedback, onRegenerate, t],
  );

  const headerContent = useCallback((): React.ReactElement | null => {
    if (isFetchingPreviousPage) {
      return (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="ms-2 text-xs text-muted-foreground">
            {t('chat.loadingOlderMessages')}
          </span>
        </div>
      );
    }
    if (!hasPreviousPage) {
      return (
        <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
          {t('chat.beginningOfConversation')}
        </div>
      );
    }
    return null;
  }, [isFetchingPreviousPage, hasPreviousPage, t]);

  const footerContent = useCallback((): React.ReactElement => {
    // The sentinel MUST live as the last DOM node inside the scroll content,
    // so the IntersectionObserver inside useStickyBottomScroll has something
    // stable to observe even when no thinking indicator is rendered. When
    // streaming, it sits below the ThinkingIndicator so growth of the live
    // panel pushes the sentinel — which triggers the parent ResizeObserver
    // and re-pins the viewport.
    if (isWaitingForResponse) {
      return (
        <div className="px-4 py-2">
          <ThinkingIndicator
            fallbackAttempts={fallbackAttempts}
            streamError={streamError}
            judgeEvaluating={judgeEvaluating}
            executingModel={executingModel}
            judgeModel={judgeModel}
            progressStages={progressStages}
            currentStageLabel={currentStageLabel}
            streamLive={streamLive}
            onCancel={onCancelStream}
            isCancelling={isCancellingStream}
          />
          <div ref={sentinelRef} aria-hidden="true" />
        </div>
      );
    }
    return (
      <div className="px-4">
        <div ref={sentinelRef} aria-hidden="true" />
      </div>
    );
  }, [
    isWaitingForResponse,
    fallbackAttempts,
    streamError,
    judgeEvaluating,
    executingModel,
    judgeModel,
    progressStages,
    currentStageLabel,
    streamLive,
    onCancelStream,
    isCancellingStream,
    sentinelRef,
  ]);

  const handleStartReached = useCallback((): void => {
    if (hasPreviousPage && !isFetchingPreviousPage) {
      onStartReached();
    }
  }, [hasPreviousPage, isFetchingPreviousPage, onStartReached]);

  if (isLoading) {
    return <LoadingSpinner label={t('chat.loadingMessages')} />;
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        {t('chat.noMessagesYet')}
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <Virtuoso
        style={{ height: '100%' }}
        data={renderItems}
        itemContent={itemContent}
        initialTopMostItemIndex={renderItems.length - 1}
        firstItemIndex={firstItemIndex}
        alignToBottom
        followOutput="smooth"
        startReached={handleStartReached}
        increaseViewportBy={{ top: 1200, bottom: 200 }}
        scrollerRef={handleScrollerRef}
        components={{
          Header: headerContent,
          Footer: footerContent,
        }}
      />
      <JumpToLatestButton
        visible={!isAtBottom && isWaitingForResponse}
        onClick={handleJumpToLatest}
        t={t}
      />
    </div>
  );
}
