'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { logger, showToast } from '@/utilities';

export function useRegenerateMessage(threadId: string, onRegenerated?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (messageId: string) => {
      logger.info({ component: 'chat', action: 'regenerate-message', message: 'Regenerating message', details: { threadId, messageId } });
      return chatRepository.regenerateMessage(messageId);
    },
    onSuccess: () => {
      logger.info({ component: 'chat', action: 'regenerate-success', message: 'Message regeneration started', details: { threadId } });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.messages(threadId),
      });
      onRegenerated?.();
    },
    onError: (error: Error) => {
      logger.error({ component: 'chat', action: 'regenerate-error', message: error.message, details: { threadId } });
      showToast.apiError(error, t('chat.regenerateFailed'));
    },
  });

  return {
    regenerate: mutation.mutate,
    isPending: mutation.isPending,
  };
}
