import { useQuery } from '@tanstack/react-query';

import { PRESENCE_SUMMARY_REFETCH_INTERVAL_MS } from '@/constants/admin-user-management.constants';
import { auditRepository } from '@/repositories/audit/audit.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { PresenceSummary } from '@/types';

/** Online-now / active-24h / banned-now counts, refreshed once a minute while the page is open. */
export function usePresenceSummary(enabled: boolean): PresenceSummary | undefined {
  const query = useQuery({
    queryKey: queryKeys.admin.presenceSummary,
    queryFn: () => auditRepository.getPresenceSummary(),
    enabled,
    refetchInterval: PRESENCE_SUMMARY_REFETCH_INTERVAL_MS,
    staleTime: PRESENCE_SUMMARY_REFETCH_INTERVAL_MS / 2,
  });
  return query.data;
}
