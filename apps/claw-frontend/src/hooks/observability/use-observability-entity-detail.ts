import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_BACKGROUND_MS } from '@/constants/query-policy.constants';
import { useObservabilityScope } from '@/hooks/observability/use-observability-scope';
import { observabilityExplorerRepository } from '@/repositories/admin/observability-explorer.repository';
import { queryKeys } from '@/repositories/shared/query-keys';

/**
 * One provider's, or one model's, full breakdown for the period. A model is named
 * by provider AND id (ids repeat across providers); a provider by its code.
 */
export function useObservabilityEntityDetail(provider: string, model: string | null) {
  const { scope, issue } = useObservabilityScope();
  const kind = model === null ? 'provider' : 'model';

  const query = useQuery({
    queryKey: queryKeys.observabilityExplorer.entityDetail(
      kind,
      { ...scope.selection, ...scope.filters },
      { provider, model },
    ),
    enabled: issue === null && provider !== '' && (model === null || model !== ''),
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    placeholderData: (previous) => previous,
    queryFn: () =>
      model === null
        ? observabilityExplorerRepository.getProviderDetail(provider, scope.buildParams())
        : observabilityExplorerRepository.getModelDetail(provider, model, scope.buildParams()),
  });

  return {
    detail: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
