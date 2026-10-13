import { useQuery } from '@tanstack/react-query';

import { REQUESTS_PAGE_SIZE } from '@/constants/observability-explorer.constants';
import { useCursorPager } from '@/hooks/observability/use-cursor-pager';
import { useListControls } from '@/hooks/observability/use-list-controls';
import { useObservabilityFilters } from '@/hooks/observability/use-observability-filters';
import { observabilityExplorerRepository } from '@/repositories/admin/observability-explorer.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ObservabilityScope } from '@/types/observability-explorer.types';

/**
 * One user's full consumption: totals, model / provider / workflow breakdowns,
 * the daily series, the heaviest requests and a searchable, pageable request list.
 *
 * Starts from the page's period and filters, then keeps its own copy so changing
 * them in the dialog never moves the page behind it. Opening the user is audited
 * server-side (ADMIN_USER_USAGE_VIEWED), so this only runs while a user is open.
 */
export function useUserConsumption(userId: string, initialScope: ObservabilityScope) {
  const filters = useObservabilityFilters({
    selection: initialScope.selection,
    filters: initialScope.filters,
  });
  const { scope } = filters;
  const controls = useListControls('time', 'desc');
  const { search, sort, order } = controls;
  const contextKey = JSON.stringify([scope.selection, scope.filters, search, sort, order]);
  const pager = useCursorPager(contextKey);
  const scopeKey = { ...scope.selection, ...scope.filters };
  const list = { search, sort, order, limit: REQUESTS_PAGE_SIZE, cursor: pager.cursor };

  const detail = useQuery({
    enabled: scope.issue === null,
    queryKey: queryKeys.observabilityExplorer.userDetail(userId, scopeKey),
    placeholderData: (previous) => previous,
    queryFn: () => observabilityExplorerRepository.getUserDetail(userId, scope.buildParams()),
  });

  const requests = useQuery({
    enabled: scope.issue === null,
    queryKey: queryKeys.observabilityExplorer.userRequests(userId, scopeKey, list),
    placeholderData: (previous) => previous,
    queryFn: () =>
      observabilityExplorerRepository.getUserRequests(userId, scope.buildParams(), list),
  });

  return {
    filters,
    controls,
    pager,
    detail: detail.data ?? null,
    requests: requests.data ?? null,
    isLoading: detail.isLoading,
    isError: detail.isError,
    isRequestsLoading: requests.isLoading,
    isRequestsFetching: requests.isFetching,
    isRequestsError: requests.isError,
    refetch: () => {
      void detail.refetch();
      void requests.refetch();
    },
  };
}
