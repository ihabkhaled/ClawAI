/**
 * One step in a turn's narrated work log.
 *
 * Kinds, not sentences: the frontend renders each through i18n in the reader's
 * language. The two exceptions carry model-written `text` — PLANNED and
 * REPLANNED are the planner's own words ("You shared a site, so I'll read it
 * first"), shown as the AI speaking.
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
  /** The planner's own reasoning, model-written `text`, shown as the AI speaking. */
  AI_THOUGHT = 'ai_thought',
}
