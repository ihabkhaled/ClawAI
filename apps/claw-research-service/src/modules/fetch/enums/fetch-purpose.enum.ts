/**
 * Why a caller is fetching a URL — decides which strategies may serve it.
 * Internal only: never read from a request body.
 */
export enum FetchPurpose {
  /** A page a person or model will read: the full escalation chain. */
  PAGE = 'PAGE',
  /**
   * robots.txt, a sitemap, a feed: parsed by code, so only the two raw HTTP
   * strategies may serve it. A renderer would return a DOM dump, the reader a
   * Markdown rewrite, and the archive an old copy — each a wrong answer to
   * "what are this site's rules / pages right now".
   */
  MACHINE_READABLE = 'MACHINE_READABLE',
}
