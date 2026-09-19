/**
 * What the planner decided a turn needs before the answering model runs.
 *
 * CRAWL_THEN_SEARCH is not "both at once": the planner is asked again after
 * the crawl, with what it read, and only searches if the pages did not answer.
 */
export enum PlannedResearchAction {
  ANSWER = 'answer',
  CRAWL = 'crawl',
  SEARCH = 'search',
  CRAWL_THEN_SEARCH = 'crawl_then_search',
}
