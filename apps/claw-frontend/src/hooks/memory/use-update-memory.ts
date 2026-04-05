import { useMutation, useQueryClient } from '@tanstack/react-query';

import { memoryRepository } from '@/repositories/memory/memory.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UpdateMemoryParams } from '@/types';
import { showToast } from '@/utilities';

export function useUpdateMemory() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: UpdateMemoryParams) => memoryRepository.updateMemory(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.memory.lists(),
      });
      showToast.success({ title: 'Memory updated' });
    },
    onError: (error: Error) => {
      showToast.apiError(error, 'Failed to update memory');
    },
  });

  return {
    updateMemory: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
