import { useCallback } from 'react';

import { type MessageFeedback, RoutingMode } from '@/enums';
import { ResearchMode } from '@/enums/research-mode.enum';
import { useTranslation } from '@/lib/i18n/use-translation';
import type {
  ModelSelection,
  ResearchOptions,
  UseThreadDetailPageParams,
  UseThreadDetailPageReturn,
} from '@/types';
import { logger } from '@/utilities';

import { useCancelStream } from './use-cancel-stream';
import { useDeleteThread } from './use-delete-thread';
import { useMessageFeedback } from './use-message-feedback';
import { useRegenerateMessage } from './use-regenerate-message';
import { useSendMessage } from './use-send-message';
import { useThreadDetail } from './use-thread-detail';
import { useThreadSettings } from './use-thread-settings';
import { useVirtualizedMessagesController } from './use-virtualized-messages-controller';

export const useThreadDetailPage = ({
  threadId,
}: UseThreadDetailPageParams): UseThreadDetailPageReturn => {
  const { t } = useTranslation();
  const {
    thread,
    messages,
    isLoadingThread,
    isLoadingMessages,
    isWaitingForResponse,
    startWaitingForResponse,
    fallbackAttempts,
    streamError,
    judgeEvaluating,
    executingModel,
    judgeModel,
    progressStages,
    currentStageLabel,
    streamLive,
    virtualizedMessages,
  } = useThreadDetail(threadId);

  const { cancel: cancelStream, isCancelling: isCancellingStream } = useCancelStream(threadId);
  const { sendMessage, isPending: isSending } = useSendMessage(threadId, startWaitingForResponse);
  const { deleteThread, isPending: isDeleting } = useDeleteThread();
  const { setFeedback } = useMessageFeedback(threadId);
  const { regenerate } = useRegenerateMessage(threadId, startWaitingForResponse);
  const threadSettings = useThreadSettings(thread);

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
      // Flip the waiting state immediately so the ThinkingIndicator appears
      // before the POST round-trip completes — otherwise the user sees no
      // feedback for 200–500ms after clicking Send. The mutation's onSuccess
      // still fires startWaitingForResponse() (which is idempotent) and
      // refreshes the message list.
      startWaitingForResponse();
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
        ...(research && research.mode !== ResearchMode.OFF
          ? {
              researchMode: research.mode,
              ...(research.providerId !== undefined
                ? { researchProviderId: research.providerId }
                : {}),
            }
          : {}),
      });
    },
    [threadId, sendMessage, startWaitingForResponse],
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

  // Compose the virtualized-messages controller so the page TSX can spread a
  // single prop bag onto <VirtualizedMessages> instead of hand-wiring 18
  // props. The .tsx never calls a hook itself.
  const virtualizedMessagesProps = useVirtualizedMessagesController({
    messages,
    isLoading: isLoadingThread || isLoadingMessages,
    isFetchingPreviousPage: virtualizedMessages.isFetchingPreviousPage,
    hasPreviousPage: virtualizedMessages.hasPreviousPage,
    firstItemIndex: virtualizedMessages.firstItemIndex,
    isWaitingForResponse,
    fallbackAttempts,
    streamError,
    judgeEvaluating,
    executingModel,
    judgeModel,
    progressStages,
    currentStageLabel,
    streamLive,
    onCancelStream: cancelStream,
    isCancellingStream,
    onStartReached: virtualizedMessages.fetchPreviousPage,
    onFeedback: handleFeedback,
    onRegenerate: handleRegenerate,
    loadingLabel: t('chat.loadingMessages'),
    emptyLabel: t('chat.noMessagesYet'),
    jumpToLatestLabelKey: 'chat.jumpToLatest',
    t,
  });

  return {
    thread,
    messages,
    isLoadingThread,
    isLoadingMessages,
    isWaitingForResponse,
    fallbackAttempts,
    streamError,
    judgeEvaluating,
    executingModel,
    judgeModel,
    progressStages,
    currentStageLabel,
    streamLive,
    cancelStream,
    isCancellingStream,
    isSending,
    isDeleting,
    virtualizedMessages,
    virtualizedMessagesProps,
    threadSettings,
    handleSend,
    handleDelete,
    handleFeedback,
    handleRegenerate,
  };
};
