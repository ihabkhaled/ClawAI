import { useQuery } from '@tanstack/react-query';

import { serverLogsRepository } from '@/repositories/logs/server-logs.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ServerLogStats } from '@/types';

export function useServerLogStats(): {
  stats: ServerLogStats | undefined;
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: queryKeys.serverLogs.stats,
    queryFn: () => serverLogsRepository.getStats(),
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
  };
}
