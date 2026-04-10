import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { memoryRepository } from '@/repositories/memory/memory.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ToggleMemoryParams } from '@/types';
import { logger, showToast } from '@/utilities';

export function useToggleMemory() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: ({ id }: ToggleMemoryParams) => {
      logger.info({ component: 'memory', action: 'toggle-memory', message: 'Toggling memory', details: { memoryId: id } });
      return memoryRepository.toggleMemory(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.memory.lists(),
      });
      showToast.success({ title: t('memory.memoryToggled') });
    },
    onError: (error: Error) => {
      showToast.apiError(error, t('memory.memoryToggleFailed'));
    },
  });

  return {
    toggleMemory: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
