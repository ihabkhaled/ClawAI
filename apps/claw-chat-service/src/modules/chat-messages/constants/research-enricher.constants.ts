// Constants for the compare-mode ResearchEnricherManager.

// Default top-K search results to request when the caller does not specify.
export const RESEARCH_ENRICHER_DEFAULT_TOP_RESULTS = 5;
// Default number of URLs to fetch / extract after the search step.
export const RESEARCH_ENRICHER_DEFAULT_TOP_FETCH = 3;

// Per-call timeouts. The search call is shorter; fetch can take longer
// because it touches arbitrary remote sites.
export const RESEARCH_ENRICHER_SEARCH_TIMEOUT_MS = 8_000;
export const RESEARCH_ENRICHER_FETCH_TIMEOUT_MS = 15_000;

// Trim lengths for the evidence body. Excerpts keep enough text for the
// model to ground while staying inside the shared prompt's token budget.
export const RESEARCH_ENRICHER_FETCH_BODY_MAX_CHARS = 2_000;
export const RESEARCH_ENRICHER_EXTRACT_BODY_MAX_CHARS = 2_500;

// Query is logged at debug only; we truncate to keep logs PII-light.
export const RESEARCH_ENRICHER_QUERY_LOG_PREVIEW_CHARS = 80;

// Evidence block headings.
export const RESEARCH_ENRICHER_EMPTY_RESULTS_BLOCK = '## Web search returned no results.';
