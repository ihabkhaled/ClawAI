import { useQuery } from "@tanstack/react-query";

import { connectorRepository } from "@/repositories/connectors/connector.repository";
import { queryKeys } from "@/repositories/shared/query-keys";

export function useConnectors() {
  const filters: Record<string, unknown> = {};

  const query = useQuery({
    queryKey: queryKeys.connectors.list(filters),
    queryFn: () => connectorRepository.getConnectors(),
  });

  return {
    connectors: query.data?.data ?? [],
    total: query.data?.meta.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
