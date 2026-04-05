'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { useTranslation } from '@/lib/i18n';
import { showToast } from '@/utilities';

export function useRegenerateMessage(threadId: string, onRegenerated?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (messageId: string) => chatRepository.regenerateMessage(messageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.messages(threadId),
      });
      onRegenerated?.();
    },
    onError: (error: Error) => {
      showToast.apiError(error, t('chat.regenerateFailed'));
    },
  });

  return {
    regenerate: mutation.mutate,
    isPending: mutation.isPending,
  };
}
