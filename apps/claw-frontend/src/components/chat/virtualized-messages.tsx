'use client';

import { Loader2 } from 'lucide-react';
import { useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';

import { MessageBubble } from '@/components/chat/message-bubble';
import { ThinkingIndicator } from '@/components/chat/thinking-indicator';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import type { VirtualizedMessagesProps } from '@/types';

export function VirtualizedMessages({
  messages,
  isLoading,
  isFetchingPreviousPage,
  hasPreviousPage,
  isWaitingForResponse,
  fallbackAttempts,
  streamError,
  onStartReached,
  onFeedback,
  onRegenerate,
}: VirtualizedMessagesProps): React.ReactElement {
  const itemContent = useCallback(
    (_index: number, message: unknown): React.ReactElement => {
      const msg = message as typeof messages[number];
      if (!msg) {
        return <div />;
      }
      return (
        <div className="px-4 py-2">
          <MessageBubble
            message={msg}
            onFeedback={onFeedback}
            onRegenerate={onRegenerate}
          />
        </div>
      );
    },
    [onFeedback, onRegenerate],
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
          <ThinkingIndicator fallbackAttempts={fallbackAttempts} streamError={streamError} />
        </div>
      );
    }
    return null;
  }, [isWaitingForResponse, fallbackAttempts, streamError]);

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
      data={messages}
      itemContent={itemContent}
      initialTopMostItemIndex={messages.length - 1}
      firstItemIndex={Math.max(0, 1000000 - messages.length)}
      alignToBottom
      followOutput="smooth"
      startReached={handleStartReached}
      increaseViewportBy={{ top: 400, bottom: 100 }}
      components={{
        Header: headerContent,
        Footer: footerContent,
      }}
    />
  );
}
