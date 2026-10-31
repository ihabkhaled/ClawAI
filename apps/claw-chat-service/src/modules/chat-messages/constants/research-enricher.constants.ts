// Constants for the compare-mode ResearchEnricherManager.

// Default top-K search results to request when the caller does not specify. AUTO
// runs every provider, so the merged list is wider than one engine's top five (ADR-212);
// the evidence budget, not this number, is what keeps the prompt inside the window.
export const RESEARCH_ENRICHER_DEFAULT_TOP_RESULTS = 10;
// Default number of URLs to fetch / extract after the search step (in parallel).
export const RESEARCH_ENRICHER_DEFAULT_TOP_FETCH = 6;

// The timeouts are NOT here: there is one set for every surface, in
// common/constants/research-client.constants.ts, used only by the research gateway.

// Per-source CEILINGS for the evidence body (were 2000 / 2500). They are not what
// is sent: `fitSourcesToResearchBudget` shortens every body evenly when the sum would pass
// the 45% evidence share of the window, so a bigger ceiling costs nothing on a small model.
export const RESEARCH_ENRICHER_FETCH_BODY_MAX_CHARS = 6_000;
export const RESEARCH_ENRICHER_EXTRACT_BODY_MAX_CHARS = 8_000;

// The window the shared evidence block is sized for when the caller does not know the
// answering model's. Compare and the labs fan one block out to several models, so this
// is a floor most current models clear, not the largest one.
export const RESEARCH_ENRICHER_ASSUMED_WINDOW_TOKENS = 16_384;

// Query is logged at debug only; we truncate to keep logs PII-light.
export const RESEARCH_ENRICHER_QUERY_LOG_PREVIEW_CHARS = 80;

// Evidence block headings.
/**
 * What the model is told when the web step ran and found nothing.
 *
 * The old value was one sentence — "## Web search returned no results." — with
 * no instruction attached, so a model reading it had nothing to do but fall
 * back on its prior, which for most models is "I can't browse the web". Stating
 * the outcome is not the same as stating what to do about it.
 */
export const RESEARCH_ENRICHER_EMPTY_RESULTS_BLOCK = [
  '## Web research ran and returned no usable results',
  '',
  'The web search and browsing steps have already been run for you by the platform.',
  "Do not say that you can't browse the web or access the internet — it was attempted.",
  'Say plainly that the web step ran and returned nothing usable, then answer from your',
  'own knowledge only if you label it as such. Do not invent sources, dates or citations.',
].join('\n');
