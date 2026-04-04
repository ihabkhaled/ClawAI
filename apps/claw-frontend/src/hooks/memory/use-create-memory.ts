import { useMutation, useQueryClient } from "@tanstack/react-query";

import { memoryRepository } from "@/repositories/memory/memory.repository";
import { queryKeys } from "@/repositories/shared/query-keys";
import type { CreateMemoryRequest } from "@/types";

export function useCreateMemory() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreateMemoryRequest) =>
      memoryRepository.createMemory(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.memory.lists(),
      });
    },
  });

  return {
    createMemory: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
