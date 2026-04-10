import { useQuery } from '@tanstack/react-query';

import { serverLogsRepository } from '@/repositories/logs/server-logs.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ServerLogsListParams } from '@/types';
import { logger } from '@/utilities';

export function useServerLogs(params: ServerLogsListParams) {
  const query = useQuery({
    queryKey: queryKeys.serverLogs.list(params as Record<string, unknown>),
    queryFn: () => {
      logger.debug({ component: 'audit', action: 'fetch-server-logs', message: 'Fetching server logs', details: { page: params.page } });
      return serverLogsRepository.getLogs(params);
    },
  });

  return {
    serverLogs: query.data?.data ?? [],
    meta: query.data?.meta ?? { total: 0, page: 1, limit: 25, totalPages: 0 },
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
