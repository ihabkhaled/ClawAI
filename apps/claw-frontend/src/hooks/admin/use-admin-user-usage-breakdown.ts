import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { USAGE_DEFAULT_HOURS } from '@/constants/usage-analytics.constants';
import { UsageRangePreset } from '@/enums/usage-range-preset.enum';
import { adminUsageAnalyticsRepository } from '@/repositories/admin/usage-analytics.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseAdminUserUsageBreakdownReturn } from '@/types/admin-usage-analytics.types';
import { buildRangeQuery } from '@/utilities/usage-analytics.utility';

/**
 * One user's models, tools and credit-connector use for the chosen period.
 * Requires ADMIN_USAGE_VIEW server-side. The window is rebuilt from the clock
 * on every fetch, so a modal left open does not report a stale "today".
 */
export function useAdminUserUsageBreakdown(userId: string): UseAdminUserUsageBreakdownReturn {
  const [preset, setPreset] = useState<UsageRangePreset>(UsageRangePreset.Month);

  const query = useQuery({
    queryKey: queryKeys.admin.userUsageBreakdown(userId, preset),
    queryFn: () =>
      adminUsageAnalyticsRepository.getUserBreakdown(
        userId,
        buildRangeQuery(
          { preset, hours: USAGE_DEFAULT_HOURS, customFrom: '', customTo: '' },
          new Date(),
        ),
      ),
  });

  const refetch = useCallback((): void => {
    void query.refetch();
  }, [query]);

  return {
    preset,
    setPreset,
    breakdown: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch,
  };
}
