import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../../repositories/shared/query-keys';
import {
  getWorkspaceObject,
  refreshWorkspaceObject,
} from '../../repositories/workspace/workspace.repository';
import type { UseWorkspaceObjectDetailReturn } from '../../types/hook.types';

export function useWorkspaceObjectDetail(id: string): UseWorkspaceObjectDetailReturn {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.workspaceObjects.detail(id),
    queryFn: () => getWorkspaceObject(id),
    enabled: id.length > 0,
  });

  const refreshMutation = useMutation({
    mutationFn: () => refreshWorkspaceObject(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.workspaceObjects.detail(id) });
    },
  });

  return {
    object: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    isRefreshing: refreshMutation.isPending,
    refreshError: refreshMutation.error as Error | null,
    refresh: () => {
      refreshMutation.mutate();
    },
  };
}
