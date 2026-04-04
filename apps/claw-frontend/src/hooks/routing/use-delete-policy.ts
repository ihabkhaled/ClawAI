import { useMutation, useQueryClient } from "@tanstack/react-query";

import { routingRepository } from "@/repositories/routing/routing.repository";
import { queryKeys } from "@/repositories/shared/query-keys";

export function useDeletePolicy() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => routingRepository.deletePolicy(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.routing.policies.lists(),
      });
    },
  });

  return {
    deletePolicy: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
