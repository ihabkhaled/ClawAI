import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_BACKGROUND_MS } from '@/constants/query-policy.constants';
import { serverLogsRepository } from '@/repositories/logs/server-logs.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ServerLogStats } from '@/types';

export function useServerLogStats(): {
  stats: ServerLogStats | undefined;
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: queryKeys.serverLogs.stats,
    // A log tail.
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    queryFn: () => serverLogsRepository.getStats(),
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
  };
}
