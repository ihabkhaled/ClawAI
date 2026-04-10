import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { PinThreadParams } from '@/types';
import { logger, showToast } from '@/utilities';

export function usePinThread() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: ({ id, isPinned }: PinThreadParams) => {
      logger.info({ component: 'chat', action: 'pin-thread', message: isPinned ? 'Pinning thread' : 'Unpinning thread', details: { threadId: id } });
      return chatRepository.updateThread(id, { isPinned });
    },
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.detail(variables.id),
      });
      showToast.success({
        title: variables.isPinned ? t('chat.threadPinned') : t('chat.threadUnpinned'),
      });
    },
    onError: (error: Error) => {
      showToast.apiError(error, t('chat.pinFailed'));
    },
  });

  return {
    pinThread: mutation.mutate,
    isPending: mutation.isPending,
  };
}
