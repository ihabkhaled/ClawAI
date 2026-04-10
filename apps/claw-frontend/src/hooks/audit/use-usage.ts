import { useQuery } from "@tanstack/react-query";

import { auditRepository } from "@/repositories/audit/audit.repository";
import { queryKeys } from "@/repositories/shared/query-keys";
import type { UsageListParams } from "@/types";
import { logger } from "@/utilities";

export function useUsage(params: UsageListParams) {
  const query = useQuery({
    queryKey: queryKeys.usage.list(params as Record<string, unknown>),
    queryFn: () => {
      logger.debug({ component: 'audit', action: 'fetch-usage', message: 'Fetching usage data', details: { page: params.page } });
      return auditRepository.getUsage(params);
    },
  });

  return {
    entries: query.data?.data ?? [],
    meta: query.data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 },
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
