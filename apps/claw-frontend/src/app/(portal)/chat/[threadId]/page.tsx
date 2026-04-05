'use client';

import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

import { MessageBubble } from '@/components/chat/message-bubble';
import { MessageComposer } from '@/components/chat/message-composer';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { useDeleteThread } from '@/hooks/chat/use-delete-thread';
import { useSendMessage } from '@/hooks/chat/use-send-message';
import { useThreadDetail } from '@/hooks/chat/use-thread-detail';
import type { ChatMessage } from '@/types';

function MessagesContent({
  isLoadingThread,
  isLoadingMessages,
  messages,
  messagesEndRef,
}: {
  isLoadingThread: boolean;
  isLoadingMessages: boolean;
  messages: ChatMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
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
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default function ThreadDetailPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = params.threadId ?? '';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { thread, messages, isLoadingThread, isLoadingMessages } = useThreadDetail(threadId);
  const { sendMessage, isPending: isSending } = useSendMessage(threadId);
  const { deleteThread, isPending: isDeleting } = useDeleteThread();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const handleSend = useCallback(
    (content: string) => {
      sendMessage({ threadId, content });
    },
    [threadId, sendMessage],
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

      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border">
        <div className="flex-1 overflow-y-auto p-4">
          <MessagesContent
            isLoadingThread={isLoadingThread}
            isLoadingMessages={isLoadingMessages}
            messages={messages}
            messagesEndRef={messagesEndRef}
          />
        </div>

        <div className="border-t p-4">
          <MessageComposer onSend={handleSend} isPending={isSending} />
        </div>
      </div>
    </div>
  );
}
