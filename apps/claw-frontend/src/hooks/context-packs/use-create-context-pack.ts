import { useMutation, useQueryClient } from "@tanstack/react-query";

import { contextPacksRepository } from "@/repositories/context-packs/context-packs.repository";
import { queryKeys } from "@/repositories/shared/query-keys";
import type { CreateContextPackRequest } from "@/types";

export function useCreateContextPack() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreateContextPackRequest) =>
      contextPacksRepository.createContextPack(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.lists(),
      });
    },
  });

  return {
    createContextPack: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
