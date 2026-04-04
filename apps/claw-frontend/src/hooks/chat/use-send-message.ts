import { useMutation, useQueryClient } from "@tanstack/react-query";

import { chatRepository } from "@/repositories/chat/chat.repository";
import { queryKeys } from "@/repositories/shared/query-keys";
import type { CreateMessageRequest } from "@/types";

export function useSendMessage(threadId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreateMessageRequest) =>
      chatRepository.createMessage(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.messages(threadId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.lists(),
      });
    },
  });

  return {
    sendMessage: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
