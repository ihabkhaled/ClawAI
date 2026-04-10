import { MessageBubble } from '@/components/chat/message-bubble';
import { ThinkingIndicator } from '@/components/chat/thinking-indicator';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import type { ChatMessage, MessagesContentProps } from '@/types';

export function MessagesContent({
  isLoadingThread,
  isLoadingMessages,
  messages,
  isWaitingForResponse,
  fallbackAttempts,
  streamError,
  messagesEndRef,
  onFeedback,
  onRegenerate,
}: MessagesContentProps): React.ReactElement {
  if (isLoadingThread || isLoadingMessages) {
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
    <div className="flex flex-col gap-4">
      {messages.map((message: ChatMessage) => (
        <MessageBubble
          key={message.id}
          message={message}
          onFeedback={onFeedback}
          onRegenerate={onRegenerate}
        />
      ))}
      {isWaitingForResponse ? (
        <ThinkingIndicator fallbackAttempts={fallbackAttempts} streamError={streamError} />
      ) : null}
      <div ref={messagesEndRef} />
    </div>
  );
}
