import { useMutation, useQueryClient } from "@tanstack/react-query";

import { memoryRepository } from "@/repositories/memory/memory.repository";
import { queryKeys } from "@/repositories/shared/query-keys";

export function useDeleteMemory() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => memoryRepository.deleteMemory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.memory.lists(),
      });
    },
  });

  return {
    deleteMemory: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
