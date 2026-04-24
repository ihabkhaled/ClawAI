import { MessageBubble } from '@/components/chat/message-bubble';
import { ThinkingIndicator } from '@/components/chat/thinking-indicator';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { useTranslation } from '@/lib/i18n';
import type { ChatMessage, MessagesContentProps } from '@/types';

export function MessagesContent({
  isLoadingThread,
  isLoadingMessages,
  messages,
  isWaitingForResponse,
  fallbackAttempts,
  streamError,
  progressStages,
  currentStageLabel,
  messagesEndRef,
  onFeedback,
  onRegenerate,
}: MessagesContentProps): React.ReactElement {
  const { t } = useTranslation();
  if (isLoadingThread || isLoadingMessages) {
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
        <ThinkingIndicator
          fallbackAttempts={fallbackAttempts}
          streamError={streamError}
          progressStages={progressStages}
          currentStageLabel={currentStageLabel}
        />
      ) : null}
      <div ref={messagesEndRef} />
    </div>
  );
}
