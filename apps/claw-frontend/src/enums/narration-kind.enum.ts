/**
 * One step in a turn's narrated work log. Mirrors chat-service's NarrationKind.
 *
 * Rendered through i18n from the kind and its params, so the log reads in the
 * user's language. PLANNED and REPLANNED also carry the planner's own sentence.
 */
export enum NarrationKind {
  PLANNED = 'planned',
  CRAWL_STARTED = 'crawl_started',
  CRAWL_PROGRESS = 'crawl_progress',
  CRAWL_DONE = 'crawl_done',
  BACK_TO_AI = 'back_to_ai',
  REPLANNED = 'replanned',
  SEARCH_STARTED = 'search_started',
  SEARCH_DONE = 'search_done',
  RESEARCH_FAILED = 'research_failed',
  AI_THINKING = 'ai_thinking',
}
