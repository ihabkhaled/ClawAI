import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  installMarketplaceListing,
  listMarketplaceListings,
} from '../../repositories/agent/marketplace.repository';
import { queryKeys } from '../../repositories/shared/query-keys';
import type { ListMarketplaceQuery } from '../../types/marketplace.types';

export function useMarketplaceListings(query?: ListMarketplaceQuery) {
  return useQuery({
    queryKey: queryKeys.agentMarketplace.list(query ?? {}),
    queryFn: () => listMarketplaceListings(query),
  });
}

export function useInstallMarketplaceListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => installMarketplaceListing(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.agentMarketplace.lists() });
      void qc.invalidateQueries({ queryKey: queryKeys.agentRecipes.lists() });
    },
  });
}
