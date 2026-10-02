import { useCallback, useMemo, useState } from 'react';

import type { IncrementalListState, UseIncrementalListResult } from '@/types/pagination.types';

/**
 * Renders a long client-side list a page at a time ("Show more").
 *
 * The count resets whenever `resetKey` changes (a new filter or search), with
 * no effect: the stored count is only trusted while its key still matches.
 * 449 model rows rendered at once made a 60,000px phone page.
 */
export function useIncrementalList<T>(
  items: readonly T[],
  resetKey: string,
  pageSize: number,
): UseIncrementalListResult<T> {
  const [state, setState] = useState<IncrementalListState>({ key: resetKey, count: pageSize });
  const count = state.key === resetKey ? state.count : pageSize;

  const showMore = useCallback((): void => {
    setState({ key: resetKey, count: count + pageSize });
  }, [resetKey, count, pageSize]);

  const visible = useMemo(() => items.slice(0, count), [items, count]);

  return {
    visible,
    shownCount: visible.length,
    totalCount: items.length,
    hasMore: items.length > count,
    showMore,
  };
}
