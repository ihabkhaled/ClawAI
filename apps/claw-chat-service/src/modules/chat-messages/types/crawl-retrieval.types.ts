// One page from a completed SITE_CRAWL run, kept in memory for the
// duration of one LLM turn so `get_crawled_page` can answer a mid-generation
// tool call without a second network round-trip to research-service — the
// content already reached chat-service once, in the run's own evidence
// bundle.
export type CrawlRetrievalPage = {
  url: string;
  title: string | null;
  content: string;
};

// Present on `ExecutionOptions` only when the triggering message's research
// run was a SITE_CRAWL with at least one page. Its presence is what decides
// whether `get_crawled_page` is offered at all — see
// `chat-execution.manager.ts`'s `invokeProviderWithProgress`.
export type CrawlRetrievalContext = {
  pages: readonly CrawlRetrievalPage[];
};
