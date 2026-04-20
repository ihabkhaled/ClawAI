import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/repositories/shared/query-keys';
import { workspaceProviderRegistryRepository } from '@/repositories/workspace/provider-registry.repository';
import type { UseProviderCatalogReturn } from '@/types';

export function useProviderCatalog(): UseProviderCatalogReturn {
  const query = useQuery({
    queryKey: queryKeys.workspaceProviders.catalog(),
    queryFn: () => workspaceProviderRegistryRepository.listCatalog(),
    staleTime: 60_000,
  });

  return {
    providers: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
  };
}
