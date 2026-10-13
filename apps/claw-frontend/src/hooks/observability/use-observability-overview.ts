import { useQuery } from '@tanstack/react-query';

import {
  DEFAULT_TOP_PREVIEW,
  TOP_PARAM,
  TOP_PREVIEW_CHOICES,
} from '@/constants/observability-pages.constants';
import { QUERY_POLL_BACKGROUND_MS } from '@/constants/query-policy.constants';
import { useObservabilityScope } from '@/hooks/observability/use-observability-scope';
import { observabilityExplorerRepository } from '@/repositories/admin/observability-explorer.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { readPositiveInt } from '@/utilities/observability-url.utility';

/** The hub's headline numbers (with the previous period) and the chosen preview size. */
export function useObservabilityOverview() {
  const { scope, issue, param, setParams } = useObservabilityScope();
  const topText = param(TOP_PARAM);
  const top = readPositiveInt(
    topText === '' ? null : topText,
    DEFAULT_TOP_PREVIEW,
    TOP_PREVIEW_CHOICES,
  );

  const query = useQuery({
    queryKey: queryKeys.observabilityExplorer.overview(
      { ...scope.selection, ...scope.filters },
      top,
    ),
    enabled: issue === null,
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    placeholderData: (previous) => previous,
    queryFn: () => observabilityExplorerRepository.getOverview(scope.buildParams()),
  });

  return {
    top,
    setTop: (next: number): void => {
      setParams({ [TOP_PARAM]: String(next) }, { keepPage: true });
    },
    overview: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
