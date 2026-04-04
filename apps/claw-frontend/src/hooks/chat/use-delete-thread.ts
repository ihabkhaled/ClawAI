import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/constants";
import { chatRepository } from "@/repositories/chat/chat.repository";
import { queryKeys } from "@/repositories/shared/query-keys";

export function useDeleteThread() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (id: string) => chatRepository.deleteThread(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.lists(),
      });
      router.push(ROUTES.CHAT);
    },
  });

  return {
    deleteThread: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
