import { useQuery } from "@tanstack/react-query";

import { auditRepository } from "@/repositories/audit/audit.repository";
import { queryKeys } from "@/repositories/shared/query-keys";
import type { AuditListParams } from "@/types";

export function useAuditLogs(params: AuditListParams) {
  const query = useQuery({
    queryKey: queryKeys.audits.list(params as Record<string, unknown>),
    queryFn: () => auditRepository.getAuditLogs(params),
  });

  return {
    auditLogs: query.data?.data ?? [],
    meta: query.data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 },
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
