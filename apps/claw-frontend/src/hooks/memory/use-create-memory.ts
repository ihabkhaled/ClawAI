import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { memoryRepository } from '@/repositories/memory/memory.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { CreateMemoryRequest } from '@/types';
import { showToast } from '@/utilities';

export function useCreateMemory() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: CreateMemoryRequest) => memoryRepository.createMemory(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.memory.lists(),
      });
      showToast.success({ title: t('memory.memoryCreated') });
    },
    onError: (error: Error) => {
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
