import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_BACKGROUND_MS } from '@/constants/query-policy.constants';
import { auditRepository } from '@/repositories/audit/audit.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { AuditListParams } from '@/types';
import { logger } from '@/utilities';

export function useAuditLogs(params: AuditListParams) {
  const query = useQuery({
    queryKey: queryKeys.audits.list(params as Record<string, unknown>),
    // An audit feed that grows without user action.
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    queryFn: () => {
      logger.debug({
        component: 'audit',
        action: 'fetch-audit-logs',
        message: 'Fetching audit logs',
        details: { page: params.page, action: params.action, severity: params.severity },
      });
      return auditRepository.getAuditLogs(params);
    },
  });

  return {
    auditLogs: query.data?.data ?? [],
    meta: query.data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 },
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
