import { useCallback, useMemo, useState } from 'react';

import type { CursorPagerState, PagerStack } from '@/types/observability-explorer.types';

/**
 * Previous / next paging over an opaque keyset cursor.
 *
 * The stack is tagged with a context key (sort, search, range, filters). When the
 * key changes the stack is ignored, so the list returns to page 1 in the SAME
 * render, with no request carrying a cursor that belongs to a different sort.
 */
export function useCursorPager(contextKey: string): CursorPagerState {
  const [stack, setStack] = useState<PagerStack>({ contextKey, cursors: [] });
  const cursors = useMemo(
    () => (stack.contextKey === contextKey ? stack.cursors : []),
    [stack, contextKey],
  );

  const goNext = useCallback(
    (nextCursor: string | null): void => {
      if (nextCursor === null) {
        return;
      }
      setStack({ contextKey, cursors: [...cursors, nextCursor] });
    },
    [contextKey, cursors],
  );

  const goPrevious = useCallback((): void => {
    setStack({ contextKey, cursors: cursors.slice(0, -1) });
  }, [contextKey, cursors]);

  return {
    cursor: cursors[cursors.length - 1],
    pageNumber: cursors.length + 1,
    hasPrevious: cursors.length > 0,
    goNext,
    goPrevious,
  };
}
