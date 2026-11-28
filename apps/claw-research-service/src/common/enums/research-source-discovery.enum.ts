/** How a stored research source reached a run (`research_sources.discoveredVia`). */
export enum ResearchSourceDiscovery {
  /** A search engine returned it (the hit, or the page opened from the hit). */
  SEARCH = 'SEARCH',
  /** The user wrote the URL in the message. */
  DIRECT = 'DIRECT',
  /** A site crawl found it. */
  CRAWL = 'CRAWL',
  /** Served from this thread's earlier research, not fetched now. */
  THREAD_MEMORY = 'THREAD_MEMORY',
}
