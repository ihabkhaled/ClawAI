import { useCallback } from 'react';

import { type MessageFeedback, RoutingMode } from '@/enums';
import type { ModelSelection, UseThreadDetailPageParams, UseThreadDetailPageReturn } from '@/types';
import { logger } from '@/utilities';

import { useDeleteThread } from './use-delete-thread';
import { useMessageFeedback } from './use-message-feedback';
import { useRegenerateMessage } from './use-regenerate-message';
import { useSendMessage } from './use-send-message';
import { useThreadDetail } from './use-thread-detail';
import { useThreadSettings } from './use-thread-settings';

export const useThreadDetailPage = ({
  threadId,
}: UseThreadDetailPageParams): UseThreadDetailPageReturn => {
  const {
    thread,
    messages,
    isLoadingThread,
    isLoadingMessages,
    isWaitingForResponse,
    startWaitingForResponse,
    fallbackAttempts,
    streamError,
    virtualizedMessages,
  } = useThreadDetail(threadId);

  const { sendMessage, isPending: isSending } = useSendMessage(threadId, startWaitingForResponse);
  const { deleteThread, isPending: isDeleting } = useDeleteThread();
  const { setFeedback } = useMessageFeedback(threadId);
  const { regenerate } = useRegenerateMessage(threadId, startWaitingForResponse);
  const threadSettings = useThreadSettings(thread);

  const handleSend = useCallback(
    (content: string, modelSelection?: ModelSelection, fileIds?: string[]): void => {
      logger.info({ component: 'chat', action: 'user-send', message: 'User sending message', details: { threadId, contentLength: content.length, hasModel: !!modelSelection, fileCount: fileIds?.length ?? 0 } });
      sendMessage({
        threadId,
        content,
        ...(modelSelection
          ? {
              routingMode: RoutingMode.MANUAL_MODEL,
              provider: modelSelection.provider,
              model: modelSelection.model,
            }
          : {}),
        ...(fileIds && fileIds.length > 0 ? { fileIds } : {}),
      });
    },
    [threadId, sendMessage],
  );

  const handleRegenerate = useCallback(
    (messageId: string): void => {
      logger.info({ component: 'chat', action: 'user-regenerate', message: 'User regenerating message', details: { threadId, messageId } });
      regenerate(messageId);
    },
    [regenerate],
  );

  const handleFeedback = useCallback(
    (messageId: string, feedback: MessageFeedback | null): void => {
      setFeedback({ messageId, feedback });
    },
    [setFeedback],
  );

  const handleDelete = useCallback((): void => {
    logger.info({ component: 'chat', action: 'user-delete-thread', message: 'User deleting thread', details: { threadId } });
    deleteThread(threadId);
  }, [threadId, deleteThread]);

  return {
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
  };
};
