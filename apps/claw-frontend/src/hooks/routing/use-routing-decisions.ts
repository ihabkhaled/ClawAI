import { useQuery } from "@tanstack/react-query";

import { routingRepository } from "@/repositories/routing/routing.repository";
import { queryKeys } from "@/repositories/shared/query-keys";

export function useRoutingDecisions(threadId: string) {
  const query = useQuery({
    queryKey: queryKeys.routing.decisions.byThread(threadId),
    queryFn: () => routingRepository.getDecisions(threadId),
    enabled: threadId.length > 0,
  });

  return {
    decisions: query.data?.data ?? [],
    total: query.data?.meta.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
