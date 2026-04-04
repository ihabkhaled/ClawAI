import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ollamaRepository } from "@/repositories/ollama/ollama.repository";
import { queryKeys } from "@/repositories/shared/query-keys";
import type { PullModelRequest } from "@/types";

export function usePullModel() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: PullModelRequest) => ollamaRepository.pullModel(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.localModels.all,
      });
    },
  });

  return {
    pullModel: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
