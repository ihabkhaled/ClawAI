import { useMutation, useQueryClient } from "@tanstack/react-query";

import { connectorRepository } from "@/repositories/connectors/connector.repository";
import { queryKeys } from "@/repositories/shared/query-keys";
import type { UpdateConnectorRequest } from "@/types";

type UpdateConnectorParams = {
  id: string;
  data: UpdateConnectorRequest;
};

export function useUpdateConnector() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: UpdateConnectorParams) =>
      connectorRepository.updateConnector(id, data),
    onSuccess: (connector) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.detail(connector.id),
      });
    },
  });

  return {
    updateConnector: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
