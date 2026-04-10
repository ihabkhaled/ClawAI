import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { memoryRepository } from '@/repositories/memory/memory.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { logger, showToast } from '@/utilities';

export function useDeleteMemory() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (id: string) => {
      logger.info({ component: 'memory', action: 'delete-memory', message: 'Deleting memory', details: { memoryId: id } });
      return memoryRepository.deleteMemory(id);
    },
    onSuccess: () => {
      logger.info({ component: 'memory', action: 'delete-memory-success', message: 'Memory deleted' });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.memory.lists(),
      });
      showToast.success({ title: t('memory.memoryDeleted') });
    },
    onError: (error: Error) => {
      logger.error({ component: 'memory', action: 'delete-memory-error', message: error.message });
      showToast.apiError(error, t('memory.memoryDeleteFailed'));
    },
  });

  return {
    deleteMemory: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
