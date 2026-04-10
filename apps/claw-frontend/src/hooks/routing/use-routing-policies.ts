import { useQuery } from "@tanstack/react-query";

import { routingRepository } from "@/repositories/routing/routing.repository";
import { queryKeys } from "@/repositories/shared/query-keys";
import { logger } from "@/utilities";

export function useRoutingPolicies() {
  const filters: Record<string, unknown> = {};

  const query = useQuery({
    queryKey: queryKeys.routing.policies.list(filters),
    queryFn: () => {
      logger.debug({ component: 'routing', action: 'fetch-policies', message: 'Fetching routing policies' });
      return routingRepository.getPolicies();
    },
  });

  return {
    policies: query.data?.data ?? [],
    total: query.data?.meta.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
