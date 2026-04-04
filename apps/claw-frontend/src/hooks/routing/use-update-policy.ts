import { useMutation, useQueryClient } from "@tanstack/react-query";

import { routingRepository } from "@/repositories/routing/routing.repository";
import { queryKeys } from "@/repositories/shared/query-keys";
import type { UpdatePolicyRequest } from "@/types";

type UpdatePolicyParams = {
  id: string;
  data: UpdatePolicyRequest;
};

export function useUpdatePolicy() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: UpdatePolicyParams) =>
      routingRepository.updatePolicy(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.routing.policies.lists(),
      });
    },
  });

  return {
    updatePolicy: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
