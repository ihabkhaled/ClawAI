import { useCallback, useEffect, useState } from 'react';

import { SEARCH_DEBOUNCE_MS } from '@/constants/observability-explorer.constants';
import type { SortOrder, UseListControlsReturn } from '@/types/observability-explorer.types';
import { nextSort } from '@/utilities/observability-explorer.utility';

/**
 * Search box and column sort for one table. The search text is debounced so a
 * query fires when typing pauses, not on every keystroke.
 */
export function useListControls(
  initialSort: string,
  initialOrder: SortOrder = 'desc',
): UseListControlsReturn {
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [sortState, setSortState] = useState({ sort: initialSort, order: initialOrder });

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchDraft.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [searchDraft]);

  const toggleSort = useCallback((column: string): void => {
    setSortState((current) => nextSort(current.sort, current.order, column));
  }, []);

  return {
    searchDraft,
    search,
    sort: sortState.sort,
    order: sortState.order,
    setSearchDraft,
    toggleSort,
  };
}
