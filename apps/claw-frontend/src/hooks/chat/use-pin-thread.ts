import { useMutation, useQueryClient } from '@tanstack/react-query';

import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { PinThreadParams } from '@/types';
import { showToast } from '@/utilities';

export function usePinThread() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, isPinned }: PinThreadParams) =>
      chatRepository.updateThread(id, { isPinned }),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.detail(variables.id),
      });
      showToast.success({
        title: variables.isPinned ? 'Thread pinned' : 'Thread unpinned',
      });
    },
    onError: (error: Error) => {
      showToast.apiError(error, 'Failed to update pin status');
    },
  });

  return {
    pinThread: mutation.mutate,
    isPending: mutation.isPending,
  };
}
