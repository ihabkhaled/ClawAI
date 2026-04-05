import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { CreateThreadRequest } from '@/types';
import { showToast } from '@/utilities';

export function useCreateThread() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (data: CreateThreadRequest) => chatRepository.createThread(data),
    onSuccess: (thread) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.lists(),
      });
      router.push(ROUTES.CHAT_THREAD(thread.id));
      showToast.success({ title: 'Thread created' });
    },
    onError: (error: Error) => {
      showToast.apiError(error, 'Failed to create thread');
    },
  });

  return {
    createThread: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
