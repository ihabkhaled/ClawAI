import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../../repositories/shared/query-keys';
import { listWorkspaceActions } from '../../repositories/workspace/workspace.repository';
import type { ListWorkspaceActionsQuery } from '../../types/workspace.types';

export function useWorkspaceActions(query?: ListWorkspaceActionsQuery) {
  return useQuery({
    queryKey: queryKeys.workspaceActions.list(query ?? {}),
    queryFn: () => listWorkspaceActions(query),
  });
}
