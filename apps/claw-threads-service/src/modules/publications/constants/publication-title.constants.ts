export const UNTITLED_PUBLICATION_TITLE = 'Untitled draft';
export const MAX_PUBLICATION_TITLE_LENGTH = 120;
export const MAX_PUBLICATION_SLUG_LENGTH = 60;

/**
 * Words that are literal path segments under `/thread-publications/public/`. A Thread whose slug
 * equalled one of them would be shadowed by that route (`public/board`, `public/discover`,
 * `public/sitemap`) and unreachable, so slug generation never issues them. The unique suffix
 * already makes a bare match impossible; this list is the guard that survives a change to it.
 */
export const RESERVED_PUBLICATION_SLUGS: ReadonlySet<string> = new Set([
  'board',
  'discover',
  'sitemap',
]);
