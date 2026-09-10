import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_BACKGROUND_MS } from '@/constants/query-policy.constants';
import { clientLogsRepository } from '@/repositories/logs/client-logs.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ClientLogsListParams } from '@/types';

export function useClientLogs(params: ClientLogsListParams) {
  const query = useQuery({
    queryKey: queryKeys.clientLogs.list(params as Record<string, unknown>),
    // A log tail.
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    // No logging in THIS queryFn. Reading the client-log table wrote a client
    // log, so the table grew while it was being watched and every poll added a
    // row. A tail that feeds itself is not a tail.
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
