/**
 * One progress tick from a `SITE_CRAWL` research run, published by
 * research-service on `RESEARCH_CRAWL_PROGRESS_CHANNEL`
 * (`@claw/shared-constants`) and consumed by chat-service to forward into
 * its own chat SSE stream. `correlationId` is opaque to research-service —
 * chat-service sets it to the thread id and reads it back to route the
 * tick to the right stream; research-service does not know it is a thread.
 */
export type ResearchCrawlProgressMessage = {
  correlationId: string;
  phase: 'started' | 'robots' | 'sitemap' | 'feed' | 'page' | 'completed';
  message: string;
  pagesFetched: number;
  /** Best-effort count of candidate URLs found so far; grows as discovery proceeds. */
  pagesDiscovered: number;
  timestamp: string;
};
