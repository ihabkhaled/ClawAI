import { useQuery } from "@tanstack/react-query";

import { auditRepository } from "@/repositories/audit/audit.repository";
import { queryKeys } from "@/repositories/shared/query-keys";

export function useAuditStats() {
  const query = useQuery({
    queryKey: queryKeys.audits.stats,
    queryFn: () => auditRepository.getAuditStats(),
  });

  return {
    stats: query.data ?? { byAction: [], bySeverity: [], total: 0 },
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
