'use client';

import { ArrowLeft, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { EditableTitle } from '@/components/chat/editable-title';
import { MessageComposer } from '@/components/chat/message-composer';
import { ThreadSettings } from '@/components/chat/thread-settings';
import { VirtualizedMessages } from '@/components/chat/virtualized-messages';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { useEditableTitle } from '@/hooks/chat/use-editable-title';
import { useResizableComposer } from '@/hooks/chat/use-resizable-composer';
import { useThreadDetailPage } from '@/hooks/chat/use-thread-detail-page';
import { useTranslation } from '@/lib/i18n/use-translation';

export default function ThreadDetailPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = params.threadId ?? '';
  const { t } = useTranslation();

  const {
    thread,
    messages,
    isLoadingThread,
    isLoadingMessages,
    isWaitingForResponse,
    fallbackAttempts,
    streamError,
    isSending,
    isDeleting,
    virtualizedMessages,
    threadSettings,
    handleSend,
    handleDelete,
    handleFeedback,
    handleRegenerate,
  } = useThreadDetailPage({ threadId });

  const editableTitle = useEditableTitle(threadId, thread?.title ?? undefined);
  const { composerHeight, handleMouseDown } = useResizableComposer();

  if (!threadId) {
    return <LoadingSpinner label="Loading thread..." />;
  }

  const title = thread?.title ?? 'Untitled';

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between sm:pb-6">
        <div className="min-w-0">
          <EditableTitle title={title} editableTitle={editableTitle} />
          {thread ? (
            <p className="mt-1 text-muted-foreground">
              {thread.routingMode}{thread.lastModel ? ` · ${thread.lastModel}` : ''}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
      </div>

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
            contextPackIds={threadSettings.contextPackIds}
            onContextPackIdsChange={threadSettings.setContextPackIds}
            onSave={threadSettings.handleSave}
            isPending={threadSettings.isPending}
          />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
        <div className="min-h-0 flex-1 overflow-hidden">
          <VirtualizedMessages
            messages={messages}
            isLoading={isLoadingThread || isLoadingMessages}
            isFetchingPreviousPage={virtualizedMessages.isFetchingPreviousPage}
            hasPreviousPage={virtualizedMessages.hasPreviousPage}
            isWaitingForResponse={isWaitingForResponse}
            fallbackAttempts={fallbackAttempts}
            streamError={streamError}
            onStartReached={virtualizedMessages.fetchPreviousPage}
            onFeedback={handleFeedback}
            onRegenerate={handleRegenerate}
          />
        </div>

        <div className="relative shrink-0 border-t" style={{ height: composerHeight }}>
          <div
            className="absolute inset-x-0 top-0 z-10 flex h-3 cursor-ns-resize items-center justify-center hover:bg-muted/50"
            onMouseDown={handleMouseDown}
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize message input"
          >
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="flex h-full flex-col p-4 pt-3">
          <MessageComposer
            onSend={handleSend}
            isPending={isSending}
            threadModel={
              thread?.preferredProvider && thread?.preferredModel
                ? {
                    provider: thread.preferredProvider,
                    model: thread.preferredModel,
                    displayName: thread.preferredModel,
                  }
                : null
            }
          />
          </div>
        </div>
      </div>
    </div>
  );
}
