// Constants of the ONE research gateway (ADR-212). The timeouts themselves live
// with the HTTP client in common/constants/research-client.constants.ts so the
// client and the gateway can never disagree; this file holds the rest.

/** Pages fetched in parallel after a search (the top-N hits, merged across providers). */
export const RESEARCH_GATEWAY_FETCH_CONCURRENCY = 6;

/** Independent tool calls from one model turn that run at the same time. */
export const RESEARCH_TOOL_CALL_PARALLEL_LIMIT = 4;

/** Provider names narrated at most; the rest are summarised by count. */
export const RESEARCH_GATEWAY_MAX_NARRATED_PROVIDERS = 8;

/**
 * research-service says this when no search provider is enabled. Matched against text
 * whose whitespace runs are already collapsed to single spaces (see the gateway utility). The hosted
 * Ollama Cloud search is used only then (or when research-service is down).
 */
export const RESEARCH_GATEWAY_NO_PROVIDER_PATTERN =
  /\bno (?:(?:enabled|active|configured) )?(?:web )?search provider/iu;

/** Failure notices carried on the transcript `warnings`, the shape the UI already renders. */
export const RESEARCH_GATEWAY_WARNING_TIMEOUT = 'research.searchTimedOut';
export const RESEARCH_GATEWAY_WARNING_FAILED = 'research.searchFailed';
