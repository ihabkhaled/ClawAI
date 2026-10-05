import { useQuery } from '@tanstack/react-query';

import { researchRepository } from '@/repositories/research/research.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { FetchStrategyStatus } from '@/types';

/**
 * Which page-reading tiers are available or off (admin-only endpoint). An error,
 * including a 403 for a non-admin, simply yields no strategies: the card hides.
 */
export function useFetchStrategies(): {
  strategies: FetchStrategyStatus[];
  isLoading: boolean;
  isError: boolean;
} {
  const query = useQuery({
    queryKey: queryKeys.researchFetchStrategies.all,
    queryFn: () => researchRepository.listFetchStrategies(),
    staleTime: 30_000,
    retry: false,
  });
  return {
    strategies: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
