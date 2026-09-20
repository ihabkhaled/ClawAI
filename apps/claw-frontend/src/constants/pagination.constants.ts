/**
 * How many rows a table may show at once.
 *
 * The backend caps `limit` at 100 on every list endpoint, so 100 is the top of
 * this list on purpose: offering 250 would produce a 400 from the API rather
 * than a bigger page.
 */
export const PAGE_SIZE_OPTIONS: readonly number[] = [10, 20, 50, 100];

/** Matches the `limit` default every list DTO already declares. */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * How many page numbers sit either side of the current one.
 *
 * With 1, page 7 of 40 renders `1 … 6 [7] 8 … 40`: seven controls, which fits
 * a 320px phone without wrapping. Raising it is a layout decision, not a
 * preference — check the narrowest breakpoint first.
 */
export const PAGE_WINDOW_SIBLINGS = 1;
