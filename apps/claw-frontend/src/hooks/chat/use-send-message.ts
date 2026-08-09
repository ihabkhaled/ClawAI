import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { CreateMessageRequest, UseSendMessageResult } from '@/types';
import { logger, showToast } from '@/utilities';
import { resolveApiErrorMessage } from '@/utilities/api-error-message.utility';

export function useSendMessage(
  threadId: string,
  onMessageSent?: () => void,
  onMessageError?: () => void,
): UseSendMessageResult {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: CreateMessageRequest) => {
      logger.info({
        component: 'chat',
        action: 'send-message-start',
        message: 'Sending message',
        details: { threadId, contentLength: data.content.length },
      });
      return chatRepository.createMessage(data);
    },
    onSuccess: () => {
      logger.info({
        component: 'chat',
        action: 'send-message',
        message: 'Message sent',
        details: { threadId },
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.messages(threadId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.lists(),
      });
      onMessageSent?.();
    },
    onError: (error: Error) => {
      logger.error({
        component: 'chat',
        action: 'send-message-error',
        message: error.message,
        details: { threadId },
      });
      const message = resolveApiErrorMessage(error, t, t('chat.messageSendFailed'));
      onMessageError?.();
      showToast.error({ title: t('common.error'), description: message });
    },
  });

  return {
    sendMessage: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    errorMessage:
      mutation.error === null
        ? null
        : resolveApiErrorMessage(mutation.error, t, t('chat.messageSendFailed')),
  };
}
