import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_BACKGROUND_MS } from '@/constants/query-policy.constants';
import { observabilityExplorerRepository } from '@/repositories/admin/observability-explorer.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ObservabilityScope } from '@/types/observability-explorer.types';

/** Totals and the bucketed series for the selected period and filters. */
export function useUsageTimeseries(scope: ObservabilityScope) {
  const query = useQuery({
    enabled: scope.issue === null,
    queryKey: queryKeys.observabilityExplorer.timeseries(
      { ...scope.selection, ...scope.filters },
      '',
    ),
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    placeholderData: (previous) => previous,
    queryFn: () => observabilityExplorerRepository.getTimeseries(scope.buildParams(), ''),
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
