import { useQuery } from '@tanstack/react-query';

import { ENTITY_SORT_COLUMNS, USER_SORT_COLUMNS } from '@/constants/observability-pages.constants';
import { QUERY_POLL_BACKGROUND_MS } from '@/constants/query-policy.constants';
import { useObservabilityScope } from '@/hooks/observability/use-observability-scope';
import { useUrlListControls } from '@/hooks/observability/use-url-list-controls';
import { observabilityExplorerRepository } from '@/repositories/admin/observability-explorer.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ObservabilityEntityKind } from '@/types/observability-pages-api.types';

/**
 * One full list for the period: every user, provider, model, plan or workflow,
 * not a top-N. Search, sort, page and page size live in the URL.
 */
export function useObservabilityList(kind: ObservabilityEntityKind) {
  const { scope, issue } = useObservabilityScope();
  const controls = useUrlListControls(
    kind === 'users' ? 'lastSeen' : 'cost',
    'desc',
    kind === 'users' ? USER_SORT_COLUMNS : ENTITY_SORT_COLUMNS,
  );
  const { search, sort, order, limit, page } = controls;
  const list = { search, sort, order, limit, page };

  const query = useQuery({
    queryKey: queryKeys.observabilityExplorer.entities(
      kind,
      { ...scope.selection, ...scope.filters },
      list,
    ),
    enabled: issue === null,
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    placeholderData: (previous) => previous,
    queryFn: () => observabilityExplorerRepository.getList(kind, scope.buildParams(), list),
  });

  return {
    controls,
    result: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
