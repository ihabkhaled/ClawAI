'use client';

import { useQuery } from '@tanstack/react-query';

import { healthRepository } from '@/repositories/health/health.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseServiceAvailabilityReturn } from '@/types';

export function useServiceAvailability(): UseServiceAvailabilityReturn {
  const query = useQuery({
    queryKey: queryKeys.health.aggregated,
    queryFn: () => healthRepository.getAggregatedHealth(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  return { health: query.data, isLoading: query.isLoading };
}
