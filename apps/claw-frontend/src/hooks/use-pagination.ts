import { useCallback, useState } from 'react';

import { DEFAULT_PAGE_SIZE } from '@/constants/pagination.constants';
import type { UsePaginationOptions, UsePaginationReturn } from '@/types/pagination.types';

/**
 * Page and page-size state for any list, with the two rules every table here
 * kept getting wrong.
 *
 * 1. **Changing the page size returns to page 1.** Page 7 of 40 at 10 rows is
 *    not page 7 of 8 at 50 rows — keeping the number silently moves the reader
 *    somewhere they did not ask to be, and on a short list it lands them past
 *    the end on an empty page.
 * 2. **A page number is clamped, not trusted.** The jump-to-page box takes
 *    typed input; `0`, `-4` and `abc` must land somewhere real rather than
 *    produce a query the API rejects.
 *
 * Upper clamping needs `totalPages`, which only the server knows, so the
 * component does that half with `clampPage`. This hook guarantees the lower
 * bound and the reset.
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const { initialPageSize = DEFAULT_PAGE_SIZE, onChange } = options;
  const [page, setPage] = useState(1);
  const [pageSize, setSize] = useState(initialPageSize);

  const goToPage = useCallback(
    (next: number): void => {
      const safe = Number.isFinite(next) ? Math.max(1, Math.floor(next)) : 1;
      setPage(safe);
      onChange?.(safe, pageSize);
    },
    [onChange, pageSize],
  );

  const setPageSize = useCallback(
    (next: number): void => {
      const safe = Math.max(1, Math.floor(next));
      setSize(safe);
      setPage(1);
      onChange?.(1, safe);
    },
    [onChange],
  );

  const reset = useCallback((): void => {
    setPage(1);
    onChange?.(1, pageSize);
  }, [onChange, pageSize]);

  return { page, pageSize, goToPage, setPageSize, reset };
}
