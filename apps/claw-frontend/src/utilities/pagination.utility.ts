import { PAGE_WINDOW_SIBLINGS } from '@/constants/pagination.constants';
import { PageWindowGap } from '@/enums/page-window-gap.enum';
import type { PageWindowItem } from '@/types/pagination.types';

/**
 * The page numbers to show for a list, with gaps where pages are skipped.
 *
 * Previous/Next alone means reaching page 40 costs 39 clicks, which is the
 * complaint this exists to answer. A full strip of 40 numbers is worse on a
 * phone, so the strip is always first page, last page, the current page and
 * `siblings` either side, with `'ellipsis'` standing in for each run that was
 * left out.
 *
 * The width is constant — it does not grow with the total — so the control
 * cannot push a table sideways at 320px.
 *
 * A gap is only inserted where it actually saves something: if exactly one
 * page would be hidden, that page is shown instead, because `1 … 3 4 5` and
 * `1 2 3 4 5` are the same width and the second is honest.
 */
export function buildPageWindow(
  currentPage: number,
  totalPages: number,
  siblings: number = PAGE_WINDOW_SIBLINGS,
): PageWindowItem[] {
  const total = Math.max(1, Math.floor(totalPages));
  const current = clampPage(currentPage, total);
  const spread = Math.max(0, Math.floor(siblings));

  // A gap only earns its place once it hides more than it costs. First, last,
  // the current page, its siblings and two markers is `5 + 2 * spread`
  // controls, so any total at or under that renders in full — showing
  // `1 2 … 5` where `1 2 3 4 5` is the same width would hide pages for nothing.
  const fullyVisibleLimit = 5 + spread * 2;
  if (total <= fullyVisibleLimit) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, total]);
  for (let page = current - spread; page <= current + spread; page += 1) {
    if (page >= 1 && page <= total) {
      pages.add(page);
    }
  }

  const ordered = [...pages].sort((left, right) => left - right);
  const window: PageWindowItem[] = [];
  let previous = 0;
  for (const page of ordered) {
    const skipped = page - previous - 1;
    if (previous !== 0 && skipped > 0) {
      // One hidden page costs the same width as the marker, so show the page.
      window.push(skipped === 1 ? previous + 1 : PageWindowGap.ELLIPSIS);
    }
    window.push(page);
    previous = page;
  }
  return window;
}

/** A page number that exists: at least 1, never past the last page. */
export function clampPage(page: number, totalPages: number): number {
  const total = Math.max(1, Math.floor(totalPages));
  if (!Number.isFinite(page)) {
    return 1;
  }
  return Math.min(Math.max(1, Math.floor(page)), total);
}

/**
 * Which rows this page is showing, as 1-based positions.
 *
 * "Showing 41-60 of 213" tells a person where they are in a way "page 3 of 11"
 * does not. The last page is short, so the end is the total, not
 * `page * pageSize`. Returns null when there is nothing to show, so the caller
 * renders an empty state instead of "Showing 1-0 of 0".
 */
export function pageRange(
  page: number,
  pageSize: number,
  totalItems: number,
): { from: number; to: number } | null {
  if (totalItems <= 0 || pageSize <= 0) {
    return null;
  }
  const from = (Math.max(1, page) - 1) * pageSize + 1;
  if (from > totalItems) {
    return null;
  }
  return { from, to: Math.min(from + pageSize - 1, totalItems) };
}
