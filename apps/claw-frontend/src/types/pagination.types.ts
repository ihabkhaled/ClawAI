import type { PageWindowGap } from '@/enums/page-window-gap.enum';

import type { TranslateFunction } from './i18n.types';

/**
 * One control in a page-number strip: a page to jump to, or the gap marker.
 *
 * A union rather than `number | null` so a gap cannot be mistaken for page 0,
 * and so the renderer has to handle both cases.
 */
export type PageWindowItem = number | PageWindowGap;

/** The server's answer about a page: what every list endpoint returns as `meta`. */
export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type UsePaginationOptions = {
  /** Rows per page to start with. Defaults to `DEFAULT_PAGE_SIZE`. */
  initialPageSize?: number;
  /**
   * Called whenever the page or page size changes — including the automatic
   * reset to page 1 when the size changes. A list that keeps its own filter
   * state uses this to stay in step.
   */
  onChange?: (page: number, pageSize: number) => void;
};

export type UsePaginationReturn = {
  page: number;
  pageSize: number;
  /** Clamped to at least 1. A caller passing 0 or -3 lands on page 1. */
  goToPage: (page: number) => void;
  /** Changing the size always returns to page 1: page 7 of 40 is not page 7 of 8. */
  setPageSize: (pageSize: number) => void;
  /** Back to page 1 without touching the size, for when a filter changes. */
  reset: () => void;
};

export type PaginationProps = {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  t: TranslateFunction;
  /** Hides the rows-per-page control where the size is fixed by the caller. */
  hidePageSize?: boolean;
  /** Test and accessibility handle for the whole control. */
  label?: string;
};
