import { useMutation, useQueryClient } from "@tanstack/react-query";

import { connectorRepository } from "@/repositories/connectors/connector.repository";
import { queryKeys } from "@/repositories/shared/query-keys";
import type { SyncModelsResponse } from "@/types";

export function useSyncConnector() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => connectorRepository.syncModels(id),
    onSuccess: (_data: SyncModelsResponse, id: string) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.models(id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.detail(id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.lists(),
      });
    },
  });

  return {
    syncModels: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data ?? null,
  };
}
