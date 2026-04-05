import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { memoryRepository } from '@/repositories/memory/memory.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UpdateMemoryParams } from '@/types';
import { showToast } from '@/utilities';

export function useUpdateMemory() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: ({ id, data }: UpdateMemoryParams) => memoryRepository.updateMemory(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.memory.lists(),
      });
      showToast.success({ title: t('memory.memoryUpdated') });
    },
    onError: (error: Error) => {
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
