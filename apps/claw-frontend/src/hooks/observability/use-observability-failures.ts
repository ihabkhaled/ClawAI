import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { AUDIT_MAX_HOURS, TABLE_PAGE_SIZE } from '@/constants/observability-explorer.constants';
import { QUERY_POLL_BACKGROUND_MS } from '@/constants/query-policy.constants';
import { FailureSort } from '@/enums/failure-sort.enum';
import { useListControls } from '@/hooks/observability/use-list-controls';
import { observabilityExplorerRepository } from '@/repositories/admin/observability-explorer.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { FailuresQuery, ObservabilityScope } from '@/types/observability-explorer.types';

/**
 * Failure groups (HIGH / CRITICAL audit events) for the SAME period as the rest
 * of the page, so the heading never claims a window it is not showing. The
 * endpoint is hours-only, so a longer period is clamped and reported as such.
 */
export function useObservabilityFailures(scope: ObservabilityScope) {
  const controls = useListControls('count', 'desc');
  const [includeSync, setIncludeSyncState] = useState(false);
  const [pageState, setPageState] = useState({ key: '', page: 1 });
  const { hours, clamped } = scope.buildHours(AUDIT_MAX_HOURS);
  const contextKey = JSON.stringify([
    scope.selection,
    includeSync,
    controls.search,
    controls.sort,
    controls.order,
  ]);
  const page = pageState.key === contextKey ? pageState.page : 1;

  const query: FailuresQuery = {
    hours,
    includeSync,
    search: controls.search,
    sort: controls.sort === FailureSort.LastSeen ? FailureSort.LastSeen : FailureSort.Count,
    order: controls.order,
    page,
    limit: TABLE_PAGE_SIZE,
  };

  const result = useQuery({
    queryKey: queryKeys.observabilityExplorer.failures(query),
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    placeholderData: (previous) => previous,
    queryFn: () => observabilityExplorerRepository.getFailures(query),
  });

  return {
    controls,
    includeSync,
    setIncludeSync: setIncludeSyncState,
    page,
    setPage: (next: number): void => {
      setPageState({ key: contextKey, page: next });
    },
    clamped,
    data: result.data ?? null,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: () => {
      void result.refetch();
    },
  };
}
