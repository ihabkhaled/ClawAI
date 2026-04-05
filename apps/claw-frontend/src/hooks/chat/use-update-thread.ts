import { useMutation, useQueryClient } from '@tanstack/react-query';

import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UpdateThreadMutationParams } from '@/types';
import { showToast } from '@/utilities';

export function useUpdateThread() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: UpdateThreadMutationParams) => chatRepository.updateThread(id, data),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.detail(variables.id),
      });
    },
    onError: (error: Error) => {
      showToast.apiError(error, 'Failed to update thread');
    },
  });

  return {
    updateThread: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
