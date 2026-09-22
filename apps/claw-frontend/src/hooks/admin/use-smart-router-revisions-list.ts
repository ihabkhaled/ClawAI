import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { SMART_ROUTER_REVISIONS_PAGE_SIZE } from '@/constants/smart-router-admin.constants';
import type { RouterConfigurationStatus } from '@/enums/router-configuration.enum';
import { usePagination } from '@/hooks/use-pagination';
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
  // Page and page-size state is the shared control's, not this tab's: the
  // constant is the starting size now, not a fixed one.
  const { page, pageSize, goToPage, setPageSize, reset } = usePagination({
    initialPageSize: SMART_ROUTER_REVISIONS_PAGE_SIZE,
  });
  const filters = { status: statusFilter, page, limit: pageSize };

  const query = useQuery({
    queryKey: queryKeys.smartRouterAdmin.list(filters),
    queryFn: () => smartRouterAdminRepository.list(filters),
  });

  const handleSetStatusFilter = useCallback(
    (status: RouterConfigurationStatus | undefined) => {
      setStatusFilter(status);
      reset();
    },
    [reset],
  );

  return {
    revisions: query.data?.data ?? [],
    meta: query.data?.meta ?? {
      total: 0,
      page,
      limit: pageSize,
      totalPages: 0,
    },
    statusFilter,
    setStatusFilter: handleSetStatusFilter,
    page,
    setPage: goToPage,
    pageSize,
    setPageSize,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
  };
}
