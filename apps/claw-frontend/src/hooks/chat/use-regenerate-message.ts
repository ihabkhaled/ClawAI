'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import type { RegenerateMessageRequest } from '@/types';
import { invalidateThreadMessages, logger, showToast } from '@/utilities';

export function useRegenerateMessage(threadId: string, onRegenerated?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: ({
      messageId,
      choice,
    }: {
      messageId: string;
      choice?: RegenerateMessageRequest;
    }) => {
      logger.info({
        component: 'chat',
        action: 'regenerate-message',
        message: 'Regenerating message',
        details: { threadId, messageId, routingMode: choice?.routingMode ?? 'default' },
      });
      return chatRepository.regenerateMessage(messageId, choice);
    },
    onSuccess: () => {
      logger.info({
        component: 'chat',
        action: 'regenerate-success',
        message: 'Message regeneration started',
        details: { threadId },
      });
      invalidateThreadMessages(queryClient, threadId);
      onRegenerated?.();
    },
    onError: (error: Error) => {
      logger.error({
        component: 'chat',
        action: 'regenerate-error',
        message: error.message,
        details: { threadId },
      });
      showToast.apiError(error, t('chat.regenerateFailed'));
    },
  });

  const { mutate } = mutation;
  const regenerate = useCallback(
    (messageId: string, choice?: RegenerateMessageRequest): void => mutate({ messageId, choice }),
    [mutate],
  );

  return {
    regenerate,
    isPending: mutation.isPending,
  };
}
