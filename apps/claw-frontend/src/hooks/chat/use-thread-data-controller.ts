import { useCallback } from 'react';

import { type MessageFeedback, RoutingMode } from '@/enums';
import { ResearchMode } from '@/enums/research-mode.enum';
import type {
  ModelSelection,
  ResearchOptions,
  UseThreadDataControllerParams,
  UseThreadDataControllerReturn,
  UseVirtualizedMessagesControllerParams,
} from '@/types';
import { logger } from '@/utilities';
import { resolveChatLimitNotice } from '@/utilities/chat-limit-notice.utility';

import { useCancelStream } from './use-cancel-stream';
import { useDeleteThread } from './use-delete-thread';
import { useMessageFeedback } from './use-message-feedback';
import { useRegenerateMessage } from './use-regenerate-message';
import { useSendMessage } from './use-send-message';
import { useThreadDetail } from './use-thread-detail';
import { useThreadSettings } from './use-thread-settings';
import { useVirtualizedMessagesController } from './use-virtualized-messages-controller';

// Data + interaction layer for the thread-detail page. Owns thread fetch,
// settings, send/delete/regenerate/feedback, and the virtualized-messages
// controller. Page-level glue (params/i18n/title-editing/composer-resize/
// plan-features/in-thread compare) lives in use-thread-detail-page.ts.
export const useThreadDataController = ({
  threadId,
  t,
  onSettingsSaved,
}: UseThreadDataControllerParams): UseThreadDataControllerReturn => {
  const detail = useThreadDetail(threadId);
  const { cancel: cancelStream, isCancelling: isCancellingStream } = useCancelStream(threadId);
  const {
    sendMessage,
    isPending: isSending,
    errorMessage: sendError,
    error: sendErrorObject,
  } = useSendMessage(threadId, detail.startWaitingForResponse, detail.stopWaitingForResponse);
  // A limit refusal becomes a line in the transcript instead of a toast that
  // fades; everything else stays a toast, because a provider outage is not a
  // standing fact about this conversation.
  const limitNotice = resolveChatLimitNotice(sendErrorObject);
  const { deleteThread, isPending: isDeleting } = useDeleteThread();
  const { setFeedback } = useMessageFeedback(threadId);
  const { regenerate } = useRegenerateMessage(threadId, detail.startWaitingForResponse);
  const threadSettings = useThreadSettings(detail.thread, onSettingsSaved);

  const handleSend = useCallback(
    (
      content: string,
      modelSelection?: ModelSelection,
      fileIds?: string[],
      research?: ResearchOptions,
    ): void => {
      logger.info({
        component: 'chat',
        action: 'user-send',
        message: 'User sending message',
        details: {
          threadId,
          contentLength: content.length,
          hasModel: !!modelSelection,
          fileCount: fileIds?.length ?? 0,
          researchMode: research?.mode ?? 'OFF',
        },
      });
      detail.startWaitingForResponse();
      sendMessage({
        threadId,
        content,
        ...(modelSelection
          ? {
              routingMode: RoutingMode.MANUAL_MODEL,
              provider: modelSelection.provider,
              model: modelSelection.model,
              modelDisplayName: modelSelection.displayName,
            }
          : {}),
        ...(fileIds && fileIds.length > 0 ? { fileIds } : {}),
        ...(research && research.mode !== ResearchMode.NONE
          ? {
              researchMode: research.mode,
              ...(research.providerId !== undefined
                ? { researchProviderId: research.providerId }
                : {}),
            }
          : {}),
      });
    },
    [threadId, sendMessage, detail],
  );

  const handleRegenerate = useCallback(
    (messageId: string): void => {
      logger.info({
        component: 'chat',
        action: 'user-regenerate',
        message: 'User regenerating message',
        details: { threadId, messageId },
      });
      regenerate(messageId);
    },
    [regenerate, threadId],
  );

  const handleFeedback = useCallback(
    (messageId: string, feedback: MessageFeedback | null): void => {
      setFeedback({ messageId, feedback });
    },
    [setFeedback],
  );

  const handleDelete = useCallback((): void => {
    logger.info({
      component: 'chat',
      action: 'user-delete-thread',
      message: 'User deleting thread',
      details: { threadId },
    });
    deleteThread(threadId);
  }, [threadId, deleteThread]);

  const virtualizedParams: UseVirtualizedMessagesControllerParams = {
    limitNotice,
    messages: detail.messages,
    isLoading: detail.isLoadingThread || detail.isLoadingMessages,
    isFetchingPreviousPage: detail.virtualizedMessages.isFetchingPreviousPage,
    hasPreviousPage: detail.virtualizedMessages.hasPreviousPage,
    firstItemIndex: detail.virtualizedMessages.firstItemIndex,
    isWaitingForResponse: detail.isWaitingForResponse,
    fallbackAttempts: detail.fallbackAttempts,
    // The limit line carries the explanation, so the generic error banner is
    // suppressed for that case rather than saying the same thing twice.
    streamError: limitNotice === null ? (sendError ?? detail.streamError) : detail.streamError,
    judgeEvaluating: detail.judgeEvaluating,
    executingModel: detail.executingModel,
    judgeModel: detail.judgeModel,
    progressStages: detail.progressStages,
    currentStageLabel: detail.currentStageLabel,
    streamLive: detail.streamLive,
    onCancelStream: cancelStream,
    isCancellingStream,
    onStartReached: detail.virtualizedMessages.fetchPreviousPage,
    onFeedback: handleFeedback,
    onRegenerate: handleRegenerate,
    // Editing a prompt re-runs the thread from it, so it has to arm the waiting
    // state exactly as sending and regenerating do. Nothing else observes that
    // a run started, and without it the page neither subscribes nor polls.
    onRerunStarted: detail.startWaitingForResponse,
    loadingLabel: t('chat.loadingMessages'),
    emptyLabel: t('chat.noMessagesYet'),
    jumpToLatestLabelKey: 'chat.jumpToLatest',
    t,
  };
  const virtualizedMessagesProps = useVirtualizedMessagesController(virtualizedParams);

  return {
    thread: detail.thread,
    messages: detail.messages,
    isLoadingThread: detail.isLoadingThread,
    isLoadingMessages: detail.isLoadingMessages,
    isWaitingForResponse: detail.isWaitingForResponse,
    fallbackAttempts: detail.fallbackAttempts,
    streamError: sendError ?? detail.streamError,
    judgeEvaluating: detail.judgeEvaluating,
    executingModel: detail.executingModel,
    judgeModel: detail.judgeModel,
    progressStages: detail.progressStages,
    currentStageLabel: detail.currentStageLabel,
    streamLive: detail.streamLive,
    cancelStream,
    isCancellingStream,
    isSending,
    isDeleting,
    virtualizedMessages: detail.virtualizedMessages,
    virtualizedMessagesProps,
    threadSettings,
    handleSend,
    handleDelete,
    handleFeedback,
    handleRegenerate,
  };
};
