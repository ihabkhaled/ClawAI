import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { listRouterModelOverrides } from '@/repositories/routing/router-models.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { RouterAdminOverride } from '@/types/router-models.types';

export function useRouterModelOverrides(
  profileId: string | null,
): UseQueryResult<RouterAdminOverride[], Error> {
  return useQuery({
    queryKey:
      profileId === null
        ? ['routerModels', 'overrides', 'noop']
        : queryKeys.routerModels.overrides(profileId),
    queryFn: () => {
      if (profileId === null) {
        throw new Error('profileId required');
      }
      return listRouterModelOverrides(profileId);
    },
    enabled: profileId !== null,
    staleTime: 30_000,
  });
}
