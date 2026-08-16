import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { SMART_ROUTER_REVISIONS_PAGE_SIZE } from '@/constants/smart-router-admin.constants';
import type { RouterConfigurationStatus } from '@/enums/router-configuration.enum';
import { smartRouterAdminRepository } from '@/repositories/admin/smart-router-admin.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseSmartRouterRevisionsListResult } from '@/types/smart-router-admin.types';

/** The full, filterable, paginated revisions list — the Revisions tab's
 * data source, and the source of the revision options offered to the
 * Publish and Compare tabs. */
export function useSmartRouterRevisionsList(): UseSmartRouterRevisionsListResult {
  const [statusFilter, setStatusFilter] = useState<RouterConfigurationStatus | undefined>(
    undefined,
  );
  const [page, setPage] = useState(1);
  const filters = { status: statusFilter, page, limit: SMART_ROUTER_REVISIONS_PAGE_SIZE };

  const query = useQuery({
    queryKey: queryKeys.smartRouterAdmin.list(filters),
    queryFn: () => smartRouterAdminRepository.list(filters),
  });

  const handleSetStatusFilter = useCallback((status: RouterConfigurationStatus | undefined) => {
    setStatusFilter(status);
    setPage(1);
  }, []);

  return {
    revisions: query.data?.data ?? [],
    meta: query.data?.meta ?? {
      total: 0,
      page,
      limit: SMART_ROUTER_REVISIONS_PAGE_SIZE,
      totalPages: 0,
    },
    statusFilter,
    setStatusFilter: handleSetStatusFilter,
    page,
    setPage,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
  };
}
