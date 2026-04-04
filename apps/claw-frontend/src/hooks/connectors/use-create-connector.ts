import { useMutation, useQueryClient } from "@tanstack/react-query";

import { connectorRepository } from "@/repositories/connectors/connector.repository";
import { queryKeys } from "@/repositories/shared/query-keys";
import type { CreateConnectorRequest } from "@/types";

export function useCreateConnector() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreateConnectorRequest) =>
      connectorRepository.createConnector(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.lists(),
      });
    },
  });

  return {
    createConnector: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
