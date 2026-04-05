import { useQuery } from '@tanstack/react-query';

import { clientLogsRepository } from '@/repositories/logs/client-logs.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ClientLogsListParams } from '@/types';

export function useClientLogs(params: ClientLogsListParams) {
  const query = useQuery({
    queryKey: queryKeys.clientLogs.list(params as Record<string, unknown>),
    queryFn: () => clientLogsRepository.getLogs(params),
  });

  return {
    clientLogs: query.data?.data ?? [],
    meta: query.data?.meta ?? { total: 0, page: 1, limit: 25, totalPages: 0 },
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
