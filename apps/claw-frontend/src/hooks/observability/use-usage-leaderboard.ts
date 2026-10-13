import { useQuery } from '@tanstack/react-query';

import { EXPLORER_PAGE_SIZE } from '@/constants/observability-explorer.constants';
import { QUERY_POLL_BACKGROUND_MS } from '@/constants/query-policy.constants';
import type { UsageLeaderboardDimension } from '@/enums/usage-leaderboard-dimension.enum';
import { useCursorPager } from '@/hooks/observability/use-cursor-pager';
import { useListControls } from '@/hooks/observability/use-list-controls';
import { observabilityExplorerRepository } from '@/repositories/admin/observability-explorer.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ObservabilityScope } from '@/types/observability-explorer.types';

/** A ranked list (provider, model, workflow or user) with search, sort and keyset paging. */
export function useUsageLeaderboard(
  scope: ObservabilityScope,
  dimension: UsageLeaderboardDimension,
  pageSize: number = EXPLORER_PAGE_SIZE,
) {
  const controls = useListControls('cost', 'desc');
  const { search, sort, order } = controls;
  const contextKey = JSON.stringify([
    scope.selection,
    scope.filters,
    dimension,
    search,
    sort,
    order,
  ]);
  const pager = useCursorPager(contextKey);
  const list = { dimension, search, sort, order, limit: pageSize, cursor: pager.cursor };

  const query = useQuery({
    enabled: scope.issue === null,
    queryKey: queryKeys.observabilityExplorer.leaderboard(
      { ...scope.selection, ...scope.filters },
      list,
    ),
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    placeholderData: (previous) => previous,
    queryFn: () => observabilityExplorerRepository.getLeaderboard(scope.buildParams(), list),
  });

  return {
    controls,
    pager,
    page: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
