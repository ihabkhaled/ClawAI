import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { getRouterModel } from '@/repositories/routing/router-models.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { RouterModel } from '@/types/router-models.types';

export function useRouterModelDetail(id: string | null): UseQueryResult<RouterModel, Error> {
  return useQuery({
    queryKey: id === null ? ['routerModels', 'detail', 'noop'] : queryKeys.routerModels.detail(id),
    queryFn: () => {
      if (id === null) {
        throw new Error('id required');
      }
      return getRouterModel(id);
    },
    enabled: id !== null,
    staleTime: 30_000,
  });
}
