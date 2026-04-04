import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ollamaRepository } from "@/repositories/ollama/ollama.repository";
import { queryKeys } from "@/repositories/shared/query-keys";
import type { AssignRoleRequest } from "@/types";

export function useAssignRole() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: AssignRoleRequest) => ollamaRepository.assignRole(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.localModels.all,
      });
    },
  });

  return {
    assignRole: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
