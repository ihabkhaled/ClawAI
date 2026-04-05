import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { memoryRepository } from '@/repositories/memory/memory.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ToggleMemoryParams } from '@/types';
import { showToast } from '@/utilities';

export function useToggleMemory() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: ({ id }: ToggleMemoryParams) => memoryRepository.toggleMemory(id),
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
