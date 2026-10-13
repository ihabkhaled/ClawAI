import { useQuery } from '@tanstack/react-query';

import { PREVIEW_SORT } from '@/constants/observability-pages.constants';
import { QUERY_POLL_BACKGROUND_MS } from '@/constants/query-policy.constants';
import { useObservabilityScope } from '@/hooks/observability/use-observability-scope';
import { observabilityExplorerRepository } from '@/repositories/admin/observability-explorer.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ObservabilityEntityKind } from '@/types/observability-pages-api.types';

/** The first `top` rows of one list for the hub, with the total so "View all N" is honest.
 * `total` is `null` until the server has answered: a count never starts at a made-up 0. */
export function useObservabilityPreview(kind: ObservabilityEntityKind, top: number) {
  const { scope, issue } = useObservabilityScope();
  const list = { sort: PREVIEW_SORT, order: 'desc' as const, limit: top, page: 1 };

  const query = useQuery({
    queryKey: queryKeys.observabilityExplorer.entities(
      `preview-${kind}`,
      { ...scope.selection, ...scope.filters },
      list,
    ),
    enabled: issue === null,
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    placeholderData: (previous) => previous,
    queryFn: () => observabilityExplorerRepository.getList(kind, scope.buildParams(), list),
  });

  return {
    rows: query.data?.items ?? null,
    total: query.data?.total ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
