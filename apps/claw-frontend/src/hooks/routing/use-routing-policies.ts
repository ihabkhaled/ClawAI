import { useQuery } from "@tanstack/react-query";

import { routingRepository } from "@/repositories/routing/routing.repository";
import { queryKeys } from "@/repositories/shared/query-keys";

export function useRoutingPolicies() {
  const filters: Record<string, unknown> = {};

  const query = useQuery({
    queryKey: queryKeys.routing.policies.list(filters),
    queryFn: () => routingRepository.getPolicies(),
  });

  return {
    policies: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
