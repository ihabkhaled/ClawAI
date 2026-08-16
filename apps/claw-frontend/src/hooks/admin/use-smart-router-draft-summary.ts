import { useQuery } from '@tanstack/react-query';

import { RouterConfigurationStatus } from '@/enums/router-configuration.enum';
import { smartRouterAdminRepository } from '@/repositories/admin/smart-router-admin.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseSmartRouterDraftSummaryResult } from '@/types/smart-router-admin.types';

const QUERY_FILTERS = { status: RouterConfigurationStatus.DRAFT, page: 1, limit: 1 };

/** The scope's most recently created DRAFT revision (list is newest-first
 * by revision number), if one exists. Nothing prevents several drafts
 * existing at once, so this is "the" draft only in the sense of "the one
 * the Chain tab edits by default" — older drafts stay reachable from the
 * Revisions tab. */
export function useSmartRouterDraftSummary(): UseSmartRouterDraftSummaryResult {
  const query = useQuery({
    queryKey: queryKeys.smartRouterAdmin.list(QUERY_FILTERS),
    queryFn: () => smartRouterAdminRepository.list(QUERY_FILTERS),
  });

  return {
    draft: query.data?.data[0] ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
  };
}
