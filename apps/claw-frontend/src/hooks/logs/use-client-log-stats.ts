import { useQuery } from '@tanstack/react-query';

import { clientLogsRepository } from '@/repositories/logs/client-logs.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ClientLogStats } from '@/types';

export function useClientLogStats(): {
  stats: ClientLogStats | undefined;
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: queryKeys.clientLogs.stats,
    queryFn: () => clientLogsRepository.getStats(),
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
  };
}
