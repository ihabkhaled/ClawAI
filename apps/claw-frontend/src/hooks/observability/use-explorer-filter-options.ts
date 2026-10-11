import { useQuery } from '@tanstack/react-query';

import {
  FILTER_OPTION_LIMIT,
  FILTER_OPTION_STALE_MS,
  NO_FILTER_OPTIONS,
  UNKNOWN_WORKFLOW,
} from '@/constants/observability-explorer.constants';
import { UsageLeaderboardDimension } from '@/enums/usage-leaderboard-dimension.enum';
import { observabilityExplorerRepository } from '@/repositories/admin/observability-explorer.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  AdminUsageFilterOptions,
  ObservabilityScope,
} from '@/types/observability-explorer.types';

/**
 * Every provider, model and workflow seen in the period, for the filter selects.
 * Asked for the RANGE ONLY: if the current filters were applied, picking one
 * provider would remove all the others from the list.
 */
export function useExplorerFilterOptions(scope: ObservabilityScope): AdminUsageFilterOptions {
  const query = useQuery({
    queryKey: queryKeys.observabilityExplorer.leaderboard(scope.selection, 'filter-options'),
    staleTime: FILTER_OPTION_STALE_MS,
    queryFn: async (): Promise<AdminUsageFilterOptions> => {
      const range = scope.buildRangeParams();
      const ask = (dimension: UsageLeaderboardDimension) =>
        observabilityExplorerRepository.getLeaderboard(range, {
          dimension,
          limit: FILTER_OPTION_LIMIT,
          sort: 'requests',
          order: 'desc',
        });
      const [providers, models, workflows] = await Promise.all([
        ask(UsageLeaderboardDimension.Provider),
        ask(UsageLeaderboardDimension.Model),
        ask(UsageLeaderboardDimension.Workflow),
      ]);
      return {
        providers: providers.items.flatMap((row) =>
          row.provider === null
            ? []
            : [{ value: row.provider, label: row.providerLabel ?? row.label }],
        ),
        models: models.items.flatMap((row) => (row.model === null ? [] : [row.model])),
        workflows: workflows.items.map((row) => (row.key === '' ? UNKNOWN_WORKFLOW : row.key)),
      };
    },
  });
  return query.data ?? NO_FILTER_OPTIONS;
}
