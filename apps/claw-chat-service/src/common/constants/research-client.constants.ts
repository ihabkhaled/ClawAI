export const RESEARCH_REQUEST_TIMEOUT_MS = 30_000;
/**
 * One page through research-service's escalation chain: its own wall clock is
 * 60 s (ADR-121) plus robots.txt and the cache, so the call needs a little more.
 */
export const RESEARCH_TOOL_FETCH_TIMEOUT_MS = 75_000;
export const SEARCH_ONLY_DEFAULT_MAX_RESULTS = 6;
export const SEARCH_THEN_FETCH_DEFAULT_MAX_RESULTS = 5;
export const SEARCH_FETCH_EXTRACT_DEFAULT_MAX_RESULTS = 4;

/**
 * A crawl reads up to forty pages at concurrency four, so it needs longer than
 * a search. Affordable only because research now runs after the POST returns;
 * inside the request it would have met nginx's 60-second limit.
 */
export const RESEARCH_CRAWL_REQUEST_TIMEOUT_MS = 300_000;
