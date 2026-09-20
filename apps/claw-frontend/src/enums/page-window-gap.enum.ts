/**
 * The gap marker in a page-number strip.
 *
 * An enum rather than a bare `'ellipsis'` literal so the renderer compares
 * against one named value, and so a gap can never be confused with a page.
 */
export enum PageWindowGap {
  ELLIPSIS = 'ellipsis',
}
