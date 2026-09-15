import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { CreateMessageRequest, UseSendMessageResult } from '@/types';
import { insertSentMessageIntoCache, logger, showToast } from '@/utilities';
import { resolveApiErrorMessage } from '@/utilities/api-error-message.utility';
import { resolveChatLimitNotice } from '@/utilities/chat-limit-notice.utility';
import { writeComposerDraft } from '@/utilities/composer-draft.utility';

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
    onSuccess: (message) => {
      logger.info({
        component: 'chat',
        action: 'send-message',
        message: 'Message sent',
        details: { threadId },
      });
      // The response IS the authoritative row — real id, real createdAt — so
      // it is written straight into the cache the thread page reads from
      // rather than discarded in favour of asking the network for it back.
      // That used to cost a full extra request on every single send; the
      // sent message renders now, in this same tick.
      insertSentMessageIntoCache(queryClient, threadId, message);
      // The orchestration poll hooks read a DIFFERENT cache shape
      // (`messages(id, page)`, not the infinite query above), which this
      // insert does not touch — they still refresh through their own
      // invalidation.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.messagesAnyPage(threadId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.lists(),
      });
      onMessageSent?.();
    },
    onError: (error: Error, variables: CreateMessageRequest) => {
      logger.error({
        component: 'chat',
        action: 'send-message-error',
        message: error.message,
        details: { threadId },
      });
      const message = resolveApiErrorMessage(error, t, t('chat.messageSendFailed'));
      onMessageError?.();
      // The composer cleared optimistically on send, so a refusal — a spent
      // quota above all — used to destroy what the user had just typed. The
      // draft is put back so the text survives to be retried tomorrow, or on a
      // larger plan, rather than having to be written again from memory.
      if (variables.content.trim().length > 0) {
        writeComposerDraft(threadId, variables.content);
      }
      // A limit refusal already renders as a card in the transcript, so a toast
      // on top of it is the same sentence twice.
      if (resolveChatLimitNotice(error) === null) {
        showToast.error({ title: t('common.error'), description: message });
      }
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
