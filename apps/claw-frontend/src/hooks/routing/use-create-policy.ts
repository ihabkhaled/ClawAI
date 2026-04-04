import { useMutation, useQueryClient } from "@tanstack/react-query";

import { routingRepository } from "@/repositories/routing/routing.repository";
import { queryKeys } from "@/repositories/shared/query-keys";
import type { CreatePolicyRequest } from "@/types";

export function useCreatePolicy() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreatePolicyRequest) =>
      routingRepository.createPolicy(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.routing.policies.lists(),
      });
    },
  });

  return {
    createPolicy: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
