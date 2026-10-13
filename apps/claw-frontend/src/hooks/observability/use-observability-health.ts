import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_BACKGROUND_MS } from '@/constants/query-policy.constants';
import { useObservabilityScope } from '@/hooks/observability/use-observability-scope';
import { observabilityExplorerRepository } from '@/repositories/admin/observability-explorer.repository';
import { queryKeys } from '@/repositories/shared/query-keys';

/** Settled and refunded holds for the period, overall and per provider. */
export function useObservabilityHealth() {
  const { scope, issue } = useObservabilityScope();

  const query = useQuery({
    queryKey: queryKeys.observabilityExplorer.health({ ...scope.selection, ...scope.filters }),
    enabled: issue === null,
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    placeholderData: (previous) => previous,
    queryFn: () => observabilityExplorerRepository.getHealth(scope.buildParams()),
  });

  return {
    report: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
