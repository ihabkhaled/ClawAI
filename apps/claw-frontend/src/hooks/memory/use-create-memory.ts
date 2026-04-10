import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { memoryRepository } from '@/repositories/memory/memory.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { CreateMemoryRequest } from '@/types';
import { logger, showToast } from '@/utilities';

export function useCreateMemory() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: CreateMemoryRequest) => {
      logger.info({ component: 'memory', action: 'create-memory', message: 'Creating memory', details: { type: data.type } });
      return memoryRepository.createMemory(data);
    },
    onSuccess: () => {
      logger.info({ component: 'memory', action: 'create-memory-success', message: 'Memory created' });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.memory.lists(),
      });
      showToast.success({ title: t('memory.memoryCreated') });
    },
    onError: (error: Error) => {
      logger.error({ component: 'memory', action: 'create-memory-error', message: error.message });
      showToast.apiError(error, t('memory.memoryCreateFailed'));
    },
  });

  return {
    createMemory: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
