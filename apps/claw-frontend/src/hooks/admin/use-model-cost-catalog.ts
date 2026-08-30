import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { modelCostRepository } from '@/repositories/admin/model-cost.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseModelCostCatalogResult } from '@/types/model-cost.types';

/** Every registry model with its RESOLVED rate and how that rate was reached. */
export function useModelCostCatalog(): UseModelCostCatalogResult {
  const query = useQuery({
    queryKey: queryKeys.adminModelCosts.catalog(),
    queryFn: () => modelCostRepository.listCatalog(),
  });

  const refetch = useCallback((): void => {
    void query.refetch();
  }, [query]);

  return {
    rows: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    refetch,
  };
}
