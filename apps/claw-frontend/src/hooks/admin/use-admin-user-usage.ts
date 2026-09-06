import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { adminUserStatisticsRepository } from '@/repositories/admin/user-statistics.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseAdminUserUsageReturn } from '@/types/admin-user-statistics.types';

/** One user's token and credit consumption. Requires ADMIN_USAGE_VIEW. */
export function useAdminUserUsage(userId: string): UseAdminUserUsageReturn {
  const query = useQuery({
    queryKey: queryKeys.admin.userUsageStatistics(userId),
    queryFn: () => adminUserStatisticsRepository.getUsageStatistics(userId),
  });

  const refetch = useCallback((): void => {
    void query.refetch();
  }, [query]);

  const tokens = query.data?.tokens ?? null;

  return {
    statistics: query.data ?? null,
    hasTokenUsage:
      tokens !== null &&
      (tokens.day.totalTokens > 0 || tokens.week.totalTokens > 0 || tokens.month.totalTokens > 0),
    isLoading: query.isLoading,
    isError: query.isError,
    refetch,
  };
}
