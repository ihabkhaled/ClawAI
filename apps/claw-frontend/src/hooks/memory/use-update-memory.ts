import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { memoryRepository } from '@/repositories/memory/memory.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UpdateMemoryParams } from '@/types';
import { logger, showToast } from '@/utilities';

export function useUpdateMemory() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: ({ id, data }: UpdateMemoryParams) => {
      logger.info({ component: 'memory', action: 'update-memory', message: 'Updating memory', details: { memoryId: id } });
      return memoryRepository.updateMemory(id, data);
    },
    onSuccess: () => {
      logger.info({ component: 'memory', action: 'update-memory-success', message: 'Memory updated' });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.memory.lists(),
      });
      showToast.success({ title: t('memory.memoryUpdated') });
    },
    onError: (error: Error) => {
      logger.error({ component: 'memory', action: 'update-memory-error', message: error.message });
      showToast.apiError(error, t('memory.memoryUpdateFailed'));
    },
  });

  return {
    updateMemory: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
