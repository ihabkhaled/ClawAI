import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/constants";
import { chatRepository } from "@/repositories/chat/chat.repository";
import { queryKeys } from "@/repositories/shared/query-keys";
import type { CreateThreadRequest } from "@/types";

export function useCreateThread() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (data: CreateThreadRequest) =>
      chatRepository.createThread(data),
    onSuccess: (thread) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.lists(),
      });
      router.push(ROUTES.CHAT_THREAD(thread.id));
    },
  });

  return {
    createThread: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
