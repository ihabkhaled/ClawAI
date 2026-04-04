import { useQuery } from "@tanstack/react-query";

import { connectorRepository } from "@/repositories/connectors/connector.repository";
import { queryKeys } from "@/repositories/shared/query-keys";

export function useConnectorDetail(connectorId: string) {
  const connectorQuery = useQuery({
    queryKey: queryKeys.connectors.detail(connectorId),
    queryFn: () => connectorRepository.getConnector(connectorId),
    enabled: !!connectorId,
  });

  const modelsQuery = useQuery({
    queryKey: queryKeys.connectors.models(connectorId),
    queryFn: () => connectorRepository.getModels(connectorId),
    enabled: !!connectorId,
  });

  return {
    connector: connectorQuery.data ?? null,
    models: modelsQuery.data?.data ?? [],
    isLoadingConnector: connectorQuery.isLoading,
    isLoadingModels: modelsQuery.isLoading,
    isError: connectorQuery.isError || modelsQuery.isError,
    error: connectorQuery.error ?? modelsQuery.error,
  };
}
