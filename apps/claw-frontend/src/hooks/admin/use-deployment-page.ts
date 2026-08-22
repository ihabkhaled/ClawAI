import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useDeploymentActions } from '@/hooks/admin/use-deployment-actions';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useTranslation } from '@/lib/i18n';
import { deploymentRepository } from '@/repositories/admin/deployment.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseDeploymentPageResult } from '@/types/deployment-page.types';

export function useDeploymentPage(): UseDeploymentPageResult {
  const { t, locale } = useTranslation();
  const { user, isLoading: isUserLoading } = useCurrentUser();
  const actions = useDeploymentActions();
  const query = useQuery({
    queryKey: queryKeys.adminDeployment.status(),
    queryFn: () => deploymentRepository.get(),
    enabled: user?.isSuperAdmin === true,
    refetchInterval: ({ state }) => (state.data?.state === 'running' ? 5_000 : 30_000),
  });
  const retry = useCallback((): void => {
    void query.refetch();
  }, [query]);

  return {
    t,
    locale,
    user: user ?? null,
    status: query.data ?? null,
    isLoading: isUserLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
    isRefreshing: query.isFetching,
    retry,
    actions,
  };
}
