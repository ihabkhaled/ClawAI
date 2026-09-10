import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_LIVE_MS } from '@/constants/query-policy.constants';

import { queryKeys } from '../../repositories/shared/query-keys';
import { listWorkspaceSyncRuns } from '../../repositories/workspace/workspace.repository';
import type { UseWorkspaceSyncRunsReturn } from '../../types/hook.types';

export function useWorkspaceSyncRuns(connectorId: string, limit = 20): UseWorkspaceSyncRunsReturn {
  const query = useQuery({
    queryKey: queryKeys.workspaceConnectors.syncRuns(connectorId),
    // Sync run status. The connector-detail page already polls its own copy; this standalone hook did not.
    refetchInterval: QUERY_POLL_LIVE_MS,
    queryFn: () => listWorkspaceSyncRuns(connectorId, limit),
    enabled: connectorId.length > 0,
    staleTime: 5_000,
  });

  return {
    runs: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
  };
}
