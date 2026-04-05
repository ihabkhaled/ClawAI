import { useMutation, useQueryClient } from '@tanstack/react-query';

import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { CreateMessageRequest } from '@/types';
import { showToast } from '@/utilities';

export function useSendMessage(threadId: string, onMessageSent?: () => void) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreateMessageRequest) => chatRepository.createMessage(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.messages(threadId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.lists(),
      });
      onMessageSent?.();
    },
    onError: (error: Error) => {
      showToast.apiError(error, 'Failed to send message');
    },
  });

  return {
    sendMessage: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
