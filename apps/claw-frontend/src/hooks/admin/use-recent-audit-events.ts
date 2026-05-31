import { useQuery } from '@tanstack/react-query';

import {
  RECENT_AUDIT_EVENTS_LIMIT,
  RECENT_AUDIT_EVENTS_REFETCH_INTERVAL_MS,
} from '@/constants/admin.constants';
import { UserRole } from '@/enums';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { auditRepository } from '@/repositories/audit/audit.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseRecentAuditEventsReturn } from '@/types/hook.types';

// Fetch the last N audit events for the admin overview card. Scoped to
// ADMIN role — non-admins shouldn't even fire the query (saves a wasted
// 403 round-trip and keeps the dashboard quiet on the network tab).
export function useRecentAuditEvents(): UseRecentAuditEventsReturn {
  const { user } = useCurrentUser();

  const queryParams = { page: 1, limit: RECENT_AUDIT_EVENTS_LIMIT };
  const query = useQuery({
    queryKey: queryKeys.audits.list(queryParams),
    queryFn: () => auditRepository.getAuditLogs(queryParams),
    refetchInterval: RECENT_AUDIT_EVENTS_REFETCH_INTERVAL_MS,
    enabled: user?.role === UserRole.ADMIN,
  });

  return {
    events: query.data?.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
