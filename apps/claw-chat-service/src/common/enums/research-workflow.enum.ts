export enum ResearchWorkflow {
  SEARCH_ONLY = 'SEARCH_ONLY',
  SEARCH_THEN_FETCH = 'SEARCH_THEN_FETCH',
  SEARCH_FETCH_EXTRACT = 'SEARCH_FETCH_EXTRACT',
  /**
   * Mirrors research-service's `ResearchWorkflowKind.SITE_CRAWL`. Never
   * chosen by `mapResearchModeToWorkflow` (there is no user-facing
   * `ResearchMode` for it) — only `classifyResearchWorkflow` upgrades an
   * already-enabled research mode to this, when the message's own language
   * asks for a whole site rather than one page.
   */
  SITE_CRAWL = 'SITE_CRAWL',
}
