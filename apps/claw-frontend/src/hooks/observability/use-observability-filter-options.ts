import type { AdminObsFilterOptions } from '@claw/shared-types';
import { useQuery } from '@tanstack/react-query';

import { FILTER_OPTION_STALE_MS } from '@/constants/observability-explorer.constants';
import { NO_PAGE_FILTER_OPTIONS } from '@/constants/observability-pages.constants';
import { observabilityExplorerRepository } from '@/repositories/admin/observability-explorer.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ObservabilityScope } from '@/types/observability-explorer.types';
import { validateSelection } from '@/utilities/usage-analytics.utility';

/**
 * Every provider, model, plan and workflow seen in the period, for the filter
 * selects. Asked for the RANGE ONLY: if the current filters were applied,
 * picking one provider would remove all the others from the list. Not asked
 * while the custom range is invalid: nothing sensible can be sent.
 */
export function useObservabilityFilterOptions(
  scope: ObservabilityScope,
  enabled: boolean,
): AdminObsFilterOptions {
  const query = useQuery({
    queryKey: queryKeys.observabilityExplorer.filterOptions(scope.selection),
    enabled: enabled && validateSelection(scope.selection) === null,
    staleTime: FILTER_OPTION_STALE_MS,
    queryFn: () => observabilityExplorerRepository.getFilterOptions(scope.buildRangeParams()),
  });
  return query.data ?? NO_PAGE_FILTER_OPTIONS;
}
