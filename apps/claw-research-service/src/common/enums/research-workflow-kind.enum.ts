export enum ResearchWorkflowKind {
  SEARCH_ONLY = 'SEARCH_ONLY',
  SEARCH_THEN_FETCH = 'SEARCH_THEN_FETCH',
  SEARCH_FETCH_EXTRACT = 'SEARCH_FETCH_EXTRACT',
  REPO_CLONE_ANALYZE = 'REPO_CLONE_ANALYZE',
  /**
   * Multi-page crawl of one site: robots.txt, sitemap.xml (including a
   * bounded nested-index walk), and a bounded set of pages fetched through
   * the same `FetchService` every other workflow uses. `intent` must
   * contain the URL to crawl — the same `detectUrlsInText` step every
   * workflow already runs finds it, so this needs no separate URL field.
   */
  SITE_CRAWL = 'SITE_CRAWL',
}
