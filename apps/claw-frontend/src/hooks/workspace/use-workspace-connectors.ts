import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../../repositories/shared/query-keys';
import { listWorkspaceConnectors } from '../../repositories/workspace/workspace.repository';
import type { ListWorkspaceConnectorsQuery } from '../../types/workspace.types';

export function useWorkspaceConnectors(query?: ListWorkspaceConnectorsQuery) {
  return useQuery({
    queryKey: queryKeys.workspaceConnectors.list(query ?? {}),
    queryFn: () => listWorkspaceConnectors(query),
  });
}
