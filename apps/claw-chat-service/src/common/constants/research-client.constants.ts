/**
 * ONE set of research timeouts for every chat surface (ADR-212). Each is
 * strictly LARGER than the bound research-service enforces on the same phase:
 * a caller that gives up first throws away results research-service is still
 * about to return, which is exactly how a slow provider's hits used to vanish
 * (the old callers waited 8 s for a search and 15 s per page).
 *
 * Research-service bounds (mirrored, not imported: services share no code):
 * the slowest search provider is cut at ~20 s and the fetch phase at ~30 s.
 */
export const RESEARCH_SERVICE_SEARCH_PHASE_BOUND_MS = 20_000;
export const RESEARCH_SERVICE_FETCH_PHASE_BOUND_MS = 30_000;
/** Search phase budget the chat side grants research-service (>= 22 s). */
export const RESEARCH_GATEWAY_SEARCH_TIMEOUT_MS = 24_000;
/** Fetch phase budget the chat side grants research-service (>= 35 s). */
export const RESEARCH_GATEWAY_FETCH_TIMEOUT_MS = 36_000;
/**
 * A whole run (search then fetch, one call to `/internal/research/runs`) is the
 * two phases back to back, so it can never be shorter than their sum.
 */
export const RESEARCH_REQUEST_TIMEOUT_MS =
  RESEARCH_GATEWAY_SEARCH_TIMEOUT_MS + RESEARCH_GATEWAY_FETCH_TIMEOUT_MS;
/**
 * One page through research-service's escalation chain: its own wall clock is
 * 60 s (ADR-121) plus robots.txt and the cache, so the call needs a little more.
 */
export const RESEARCH_TOOL_FETCH_TIMEOUT_MS = 75_000;
export const SEARCH_ONLY_DEFAULT_MAX_RESULTS = 8;
export const SEARCH_THEN_FETCH_DEFAULT_MAX_RESULTS = 8;
export const SEARCH_FETCH_EXTRACT_DEFAULT_MAX_RESULTS = 6;

/**
 * A crawl reads up to forty pages at concurrency four, so it needs longer than
 * a search. Affordable only because research now runs after the POST returns;
 * inside the request it would have met nginx's 60-second limit.
 */
export const RESEARCH_CRAWL_REQUEST_TIMEOUT_MS = 300_000;
