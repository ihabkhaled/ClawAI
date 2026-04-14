import { useState } from 'react';

import { WORKSPACE_SEARCH_DEBOUNCE_MS } from '../../constants/workspace-search.constants';
import type { UseWorkspaceSearchPageReturn } from '../../types/hook.types';
import { useDebounce } from '../common/use-debounce';

import { useWorkspaceSearch } from './use-workspace-search';

export function useWorkspaceSearchPage(): UseWorkspaceSearchPageReturn {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, WORKSPACE_SEARCH_DEBOUNCE_MS);
  const { data, isLoading, isError } = useWorkspaceSearch(debouncedQuery);

  return {
    query,
    setQuery,
    results: data?.results ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
  };
}
