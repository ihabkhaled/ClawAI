'use client';

import { ArrowLeft, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

import { MessageBubble } from '@/components/chat/message-bubble';
import { MessageComposer } from '@/components/chat/message-composer';
import { ThinkingIndicator } from '@/components/chat/thinking-indicator';
import { ThreadSettings } from '@/components/chat/thread-settings';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { RoutingMode } from '@/enums';
import type { MessageFeedback } from '@/enums';
import { useDeleteThread } from '@/hooks/chat/use-delete-thread';
import { useMessageFeedback } from '@/hooks/chat/use-message-feedback';
import { useRegenerateMessage } from '@/hooks/chat/use-regenerate-message';
import { useSendMessage } from '@/hooks/chat/use-send-message';
import { useThreadDetail } from '@/hooks/chat/use-thread-detail';
import { useThreadSettings } from '@/hooks/chat/use-thread-settings';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { ChatMessage, ModelSelection } from '@/types';

function MessagesContent({
  isLoadingThread,
  isLoadingMessages,
  messages,
  isWaitingForResponse,
  messagesEndRef,
  onFeedback,
  onRegenerate,
}: {
  isLoadingThread: boolean;
  isLoadingMessages: boolean;
  messages: ChatMessage[];
  isWaitingForResponse: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onFeedback: (messageId: string, feedback: MessageFeedback | null) => void;
  onRegenerate: (messageId: string) => void;
}): React.ReactElement {
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
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} onFeedback={onFeedback} onRegenerate={onRegenerate} />
      ))}
      {isWaitingForResponse ? <ThinkingIndicator /> : null}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default function ThreadDetailPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = params.threadId ?? '';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { t } = useTranslation();
  const { thread, messages, isLoadingThread, isLoadingMessages, isWaitingForResponse, startWaitingForResponse } =
    useThreadDetail(threadId);
  const { sendMessage, isPending: isSending } = useSendMessage(threadId, startWaitingForResponse);
  const { deleteThread, isPending: isDeleting } = useDeleteThread();
  const { setFeedback } = useMessageFeedback(threadId);
  const { regenerate } = useRegenerateMessage(threadId, startWaitingForResponse);
  const threadSettings = useThreadSettings(thread);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isWaitingForResponse, scrollToBottom]);

  const handleSend = useCallback(
    (content: string, modelSelection?: ModelSelection) => {
      sendMessage({
        threadId,
        content,
        ...(modelSelection ? {
          routingMode: RoutingMode.MANUAL_MODEL,
          provider: modelSelection.provider,
          model: modelSelection.model,
        } : {}),
      });
    },
    [threadId, sendMessage],
  );

  const handleRegenerate = useCallback(
    (messageId: string) => {
      regenerate(messageId);
    },
    [regenerate],
  );

  const handleFeedback = useCallback(
    (messageId: string, feedback: MessageFeedback | null) => {
      setFeedback({ messageId, feedback });
    },
    [setFeedback],
  );

  const handleDelete = useCallback(() => {
    deleteThread(threadId);
  }, [threadId, deleteThread]);

  if (!threadId) {
    return <LoadingSpinner label="Loading thread..." />;
  }

  const title = thread?.title ?? 'Untitled';

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={title}
        description={
          thread
            ? `${thread.routingMode}${thread.lastModel ? ` \u00b7 ${thread.lastModel}` : ''}`
            : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 min-w-11"
              onClick={threadSettings.toggleOpen}
            >
              <Settings className="h-4 w-4 sm:me-2" />
              <span className="hidden sm:inline">{t('chat.threadSettings')}</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="min-h-11 min-w-11"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 sm:me-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
            <Button variant="outline" size="sm" className="min-h-11" asChild>
              <Link href={ROUTES.CHAT}>
                <ArrowLeft className="h-4 w-4 sm:me-2 rtl:rotate-180" />
                <span className="hidden sm:inline">Back to threads</span>
              </Link>
            </Button>
          </div>
        }
      />

      {threadSettings.isOpen ? (
        <div className="mb-4">
          <ThreadSettings
            t={t}
            systemPrompt={threadSettings.systemPrompt}
            onSystemPromptChange={threadSettings.setSystemPrompt}
            temperature={threadSettings.temperature}
            onTemperatureChange={threadSettings.setTemperature}
            maxTokens={threadSettings.maxTokens}
            onMaxTokensChange={threadSettings.setMaxTokens}
            selectedModel={threadSettings.selectedModel}
            onModelChange={threadSettings.setSelectedModel}
            onSave={threadSettings.handleSave}
            isPending={threadSettings.isPending}
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border">
        <div className="flex-1 overflow-y-auto p-4">
          <MessagesContent
            isLoadingThread={isLoadingThread}
            isLoadingMessages={isLoadingMessages}
            messages={messages}
            isWaitingForResponse={isWaitingForResponse}
            messagesEndRef={messagesEndRef}
            onFeedback={handleFeedback}
            onRegenerate={handleRegenerate}
          />
        </div>

        <div className="border-t p-4">
          <MessageComposer
            onSend={handleSend}
            isPending={isSending}
            threadModel={thread?.preferredProvider && thread?.preferredModel ? {
              provider: thread.preferredProvider,
              model: thread.preferredModel,
              displayName: thread.preferredModel,
            } : null}
          />
        </div>
      </div>
    </div>
  );
}
