import { useQuery } from '@tanstack/react-query';

import { smartRouterAdminRepository } from '@/repositories/admin/smart-router-admin.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseSmartRouterSelectableDeploymentsResult } from '@/types/smart-router-admin.types';

/**
 * The models a chain entry may name.
 *
 * The chain's model field used to be free text, and an alias resolves to a
 * deployment exactly or not at all — no family fallback, so the admin page can
 * never show a chain different from the one running. The cost of that
 * strictness is that one retired name produces an entry which is silently
 * skipped on every request, which is how three of four cross-provider entries
 * sat dead for a month. A picker removes the failure mode at the source.
 */
export function useSmartRouterSelectableDeployments(): UseSmartRouterSelectableDeploymentsResult {
  const query = useQuery({
    queryKey: queryKeys.smartRouterAdmin.selectableDeployments(),
    queryFn: () => smartRouterAdminRepository.listSelectableDeployments(),
  });

  return {
    deployments: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
