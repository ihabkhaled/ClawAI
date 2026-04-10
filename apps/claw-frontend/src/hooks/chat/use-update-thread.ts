import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UpdateThreadMutationParams } from '@/types';
import { logger, showToast } from '@/utilities';

export function useUpdateThread() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: ({ id, data }: UpdateThreadMutationParams) => {
      logger.info({ component: 'chat', action: 'update-thread', message: 'Updating thread', details: { threadId: id } });
      return chatRepository.updateThread(id, data);
    },
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.detail(variables.id),
      });
    },
    onError: (error: Error) => {
      logger.error({ component: 'chat', action: 'update-thread-error', message: error.message });
      showToast.apiError(error, t('chat.threadUpdateFailed'));
    },
  });

  return {
    updateThread: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
