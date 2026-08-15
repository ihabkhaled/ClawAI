import { useQuery } from '@tanstack/react-query';

import { RouterConfigurationStatus } from '@/enums/router-configuration.enum';
import { smartRouterAdminRepository } from '@/repositories/admin/smart-router-admin.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseSmartRouterPublishedSummaryResult } from '@/types/smart-router-admin.types';

const QUERY_FILTERS = { status: RouterConfigurationStatus.PUBLISHED, page: 1, limit: 1 };

/** The scope's single PUBLISHED revision (list ordered newest-first, so
 * limit 1 is enough — the backend enforces at most one PUBLISHED revision
 * per scope at a time via publish()'s supersede step). */
export function useSmartRouterPublishedSummary(): UseSmartRouterPublishedSummaryResult {
  const query = useQuery({
    queryKey: queryKeys.smartRouterAdmin.list(QUERY_FILTERS),
    queryFn: () => smartRouterAdminRepository.list(QUERY_FILTERS),
  });

  return {
    published: query.data?.data[0] ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
  };
}
