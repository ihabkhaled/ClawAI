import { useQuery } from '@tanstack/react-query';

import {
  WORKSPACE_SEARCH_DEFAULT_LIMIT,
  WORKSPACE_SEARCH_MIN_QUERY_LENGTH,
} from '../../constants/workspace-search.constants';
import { queryKeys } from '../../repositories/shared/query-keys';
import { searchWorkspace } from '../../repositories/workspace/workspace.repository';

export function useWorkspaceSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.workspaceSearch.results(query),
    queryFn: () => searchWorkspace({ query, limit: WORKSPACE_SEARCH_DEFAULT_LIMIT }),
    enabled: query.length >= WORKSPACE_SEARCH_MIN_QUERY_LENGTH,
  });
}
