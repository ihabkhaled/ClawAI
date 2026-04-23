'use client';

import { Loader2 } from 'lucide-react';
import { useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';

import { MessageBubble } from '@/components/chat/message-bubble';
import { ParallelMessageGroup } from '@/components/chat/parallel-message-group';
import { ThinkingIndicator } from '@/components/chat/thinking-indicator';
import { LoadingSpinner } from '@/components/common/loading-spinner';
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
  t,
  onStartReached,
  onFeedback,
  onRegenerate,
}: VirtualizedMessagesProps): React.ReactElement {
  const renderItems = groupParallelMessages(messages);

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
          <span className="ms-2 text-xs text-muted-foreground">Loading older messages...</span>
        </div>
      );
    }
    if (!hasPreviousPage) {
      return (
        <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
          Beginning of conversation
        </div>
      );
    }
    return null;
  }, [isFetchingPreviousPage, hasPreviousPage]);

  const footerContent = useCallback((): React.ReactElement | null => {
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
          />
        </div>
      );
    }
    return null;
  }, [
    isWaitingForResponse,
    fallbackAttempts,
    streamError,
    judgeEvaluating,
    executingModel,
    judgeModel,
    progressStages,
    currentStageLabel,
  ]);

  const handleStartReached = useCallback((): void => {
    if (hasPreviousPage && !isFetchingPreviousPage) {
      onStartReached();
    }
  }, [hasPreviousPage, isFetchingPreviousPage, onStartReached]);

  if (isLoading) {
    return <LoadingSpinner label="Loading messages..." />;
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        No messages yet. Send a message to start the conversation.
      </div>
    );
  }

  return (
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
      components={{
        Header: headerContent,
        Footer: footerContent,
      }}
    />
  );
}
