import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../../repositories/shared/query-keys';
import { listWorkspaceSyncRuns } from '../../repositories/workspace/workspace.repository';
import type { UseWorkspaceSyncRunsReturn } from '../../types/hook.types';

export function useWorkspaceSyncRuns(connectorId: string, limit = 20): UseWorkspaceSyncRunsReturn {
  const query = useQuery({
    queryKey: queryKeys.workspaceConnectors.syncRuns(connectorId),
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
