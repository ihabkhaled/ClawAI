import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../../repositories/shared/query-keys';
import { listWorkspaceObjects } from '../../repositories/workspace/workspace.repository';
import type { ListWorkspaceObjectsQuery } from '../../types/workspace.types';

export function useWorkspaceObjects(query?: ListWorkspaceObjectsQuery, refetchIntervalMs?: number) {
  return useQuery({
    queryKey: queryKeys.workspaceObjects.list(query ?? {}),
    queryFn: () => listWorkspaceObjects(query),
    refetchInterval: refetchIntervalMs ?? false,
  });
}
