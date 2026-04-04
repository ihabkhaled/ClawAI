import { useMutation, useQueryClient } from "@tanstack/react-query";

import { memoryRepository } from "@/repositories/memory/memory.repository";
import { queryKeys } from "@/repositories/shared/query-keys";

type ToggleMemoryParams = {
  id: string;
};

export function useToggleMemory() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id }: ToggleMemoryParams) =>
      memoryRepository.toggleMemory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.memory.lists(),
      });
    },
  });

  return {
    toggleMemory: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
