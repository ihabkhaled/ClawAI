import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_BACKGROUND_MS } from '@/constants/query-policy.constants';
import { healthRepository } from '@/repositories/health/health.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseServiceStatusReturn } from '@/types';

/**
 * The service-status section of /observability (observability plan B3).
 *
 * A dashboard: a component can go down while nobody is looking, but no one is
 * waiting on a particular row, so it polls on the BACKGROUND tier. The server
 * caches the history for a minute, so a faster beat would buy nothing.
 */
export function useServiceStatus(): UseServiceStatusReturn {
  const query = useQuery({
    queryKey: queryKeys.health.status,
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    queryFn: () => healthRepository.getStatusPage(),
  });

  return { status: query.data, isLoading: query.isLoading, isError: query.isError };
}
