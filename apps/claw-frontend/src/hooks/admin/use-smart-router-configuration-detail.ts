import { useQuery } from '@tanstack/react-query';

import { smartRouterAdminRepository } from '@/repositories/admin/smart-router-admin.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseSmartRouterConfigurationDetailResult } from '@/types/smart-router-admin.types';

/** One revision's full detail (header fields + ordered entries), by id.
 * Called once per id the page needs at once (the Chain tab's resolved
 * target, the Revision Detail tab's selection, and the Compare tab's two
 * picks) — each id is its own query key, so `null` simply disables it. */
export function useSmartRouterConfigurationDetail(
  id: string | null,
): UseSmartRouterConfigurationDetailResult {
  const query = useQuery({
    queryKey: queryKeys.smartRouterAdmin.detail(id),
    queryFn: () =>
      id === null
        ? Promise.reject(new Error('id required'))
        : smartRouterAdminRepository.getById(id),
    enabled: id !== null,
  });

  return {
    configuration: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
  };
}
