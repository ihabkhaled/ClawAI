import { useQuery } from '@tanstack/react-query';

import { SYNC_HEALTH_REFRESH_MS } from '../../constants/sync-cadence.constants';
import { queryKeys } from '../../repositories/shared/query-keys';
import { getSyncHealthDashboard } from '../../repositories/workspace/sync-health.repository';
import type { UseSyncHealthDashboardResult } from '../../types/sync-health-hook.types';

export function useSyncHealthDashboard(): UseSyncHealthDashboardResult {
  const query = useQuery({
    queryKey: queryKeys.workspaceSyncHealth.dashboard(),
    queryFn: getSyncHealthDashboard,
    refetchInterval: SYNC_HEALTH_REFRESH_MS,
    staleTime: SYNC_HEALTH_REFRESH_MS / 2,
  });
  return {
    dashboard: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    refetch: () => void query.refetch(),
  };
}
