import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { UserRole } from '@/enums/user-role.enum';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useTranslation } from '@/lib/i18n';
import { billingDashboardRepository } from '@/repositories/admin/billing-dashboard.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseAdminBillingDashboardResult } from '@/types/admin-billing-dashboard.types';

export function useAdminBillingDashboard(): UseAdminBillingDashboardResult {
  const { t, locale } = useTranslation();
  const { user } = useCurrentUser();
  const query = useQuery({
    queryKey: queryKeys.adminBilling.dashboard(),
    queryFn: () => billingDashboardRepository.get(),
    enabled: user?.role === UserRole.ADMIN,
    staleTime: 30_000,
  });
  const retry = useCallback((): void => {
    void query.refetch();
  }, [query]);

  return {
    t,
    locale,
    user: user ?? null,
    dashboard: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    retry,
  };
}
