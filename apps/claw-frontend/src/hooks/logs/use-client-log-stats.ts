import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_BACKGROUND_MS } from '@/constants/query-policy.constants';
import { clientLogsRepository } from '@/repositories/logs/client-logs.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ClientLogStats } from '@/types';

export function useClientLogStats(): {
  stats: ClientLogStats | undefined;
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: queryKeys.clientLogs.stats,
    // A log tail.
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    queryFn: () => clientLogsRepository.getStats(),
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
  };
}
