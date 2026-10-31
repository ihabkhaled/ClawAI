/** Maximum evidence items included in a bundle regardless of mode. */
export const EVIDENCE_MAX_ITEMS = 20;
/** Snippet length in compressed mode. */
export const EVIDENCE_COMPRESSED_SNIPPET_LENGTH = 200;
/** Snippet length in detailed mode. */
export const EVIDENCE_DETAILED_SNIPPET_LENGTH = 1500;

/**
 * Search hits fetched after a search_then_fetch workflow (ADR-211). Was 3,
 * fetched one after another. Distinct hosts come first; see
 * `EVIDENCE_FETCH_MAX_PER_HOST`.
 */
export const EVIDENCE_FETCH_TOP_N = 8;
/** Most hits taken from one host, so one site cannot fill the batch. */
export const EVIDENCE_FETCH_MAX_PER_HOST = 2;
/** Pages of a fetch batch in flight at once (across hosts; one host is serial). */
export const EVIDENCE_FETCH_CONCURRENCY = 6;
/**
 * Wall-clock cap for one whole fetch phase. Pages that finished are used;
 * unfinished ones are reported TIMEOUT. The phase never hangs the answer.
 */
export const EVIDENCE_FETCH_PHASE_DEADLINE_MS = 30_000;
/**
 * Total characters of fetched-page text one bundle may carry above the
 * per-item floor (`EVIDENCE_DETAILED_SNIPPET_LENGTH`). Shared fairly,
 * best-ranked first, so eight pages cannot blow the model's window.
 */
export const EVIDENCE_FETCH_CONTEXT_BUDGET_CHARS = 96_000;
