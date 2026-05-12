import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { listRouterModels } from '@/repositories/routing/router-models.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ListRouterModelsQuery, RouterModelsList } from '@/types/router-models.types';

export function useRouterModelsList(
  query: ListRouterModelsQuery,
): UseQueryResult<RouterModelsList, Error> {
  return useQuery({
    queryKey: queryKeys.routerModels.list(query as Record<string, unknown>),
    queryFn: () => listRouterModels(query),
    staleTime: 30_000,
  });
}
