import { useQuery } from "@tanstack/react-query";

import { auditRepository } from "@/repositories/audit/audit.repository";
import { queryKeys } from "@/repositories/shared/query-keys";
import { logger } from "@/utilities";

export function useAuditStats() {
  const query = useQuery({
    queryKey: queryKeys.audits.stats,
    queryFn: () => {
      logger.debug({ component: 'audit', action: 'fetch-audit-stats', message: 'Fetching audit statistics' });
      return auditRepository.getAuditStats();
    },
  });

  return {
    stats: query.data ?? { byAction: [], bySeverity: [], total: 0 },
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
