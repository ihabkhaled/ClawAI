import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_LIVE_MS } from '@/constants/query-policy.constants';

import { queryKeys } from '../../repositories/shared/query-keys';
import { listWorkspaceActions } from '../../repositories/workspace/workspace.repository';
import type { ListWorkspaceActionsQuery } from '../../types/workspace.types';

export function useWorkspaceActions(query?: ListWorkspaceActionsQuery) {
  return useQuery({
    queryKey: queryKeys.workspaceActions.list(query ?? {}),
    // The approval queue. The AI drafts these server-side, so nothing this user does creates them.
    refetchInterval: QUERY_POLL_LIVE_MS,
    queryFn: () => listWorkspaceActions(query),
  });
}
