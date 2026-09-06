import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { adminUserStatisticsRepository } from '@/repositories/admin/user-statistics.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseAdminUserSubscriptionReturn } from '@/types/admin-user-statistics.types';

/**
 * One user's plan standing (auth-service) and billing history (payment-service).
 *
 * Two queries, one reported status: the two services own different halves of the
 * same answer and neither may read the other's tables, so the modal fetches both
 * and renders them together. Both are gated on ADMIN_PLANS_MANAGE.
 */
export function useAdminUserSubscription(userId: string): UseAdminUserSubscriptionReturn {
  const planQuery = useQuery({
    queryKey: queryKeys.admin.userPlanOverview(userId),
    queryFn: () => adminUserStatisticsRepository.getPlanOverview(userId),
  });
  const billingQuery = useQuery({
    queryKey: queryKeys.admin.userSubscriptionStatistics(userId),
    queryFn: () => adminUserStatisticsRepository.getSubscriptionStatistics(userId),
  });

  const refetch = useCallback((): void => {
    void planQuery.refetch();
    void billingQuery.refetch();
  }, [planQuery, billingQuery]);

  return {
    planOverview: planQuery.data ?? null,
    subscriptionStatistics: billingQuery.data ?? null,
    isLoading: planQuery.isLoading || billingQuery.isLoading,
    isError: planQuery.isError || billingQuery.isError,
    refetch,
  };
}
