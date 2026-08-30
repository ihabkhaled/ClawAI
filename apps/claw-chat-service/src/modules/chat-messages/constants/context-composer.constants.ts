/**
 * Context Composer V2 tuning.
 *
 * Every number here is a budget or a floor. None of them is a rule that can
 * remove a message on its own — that was the previous design's mistake, and
 * ADR-084 records why the composer only ever ranks and fits.
 */

/**
 * Complete turns that are ALWAYS sent, budget permitting, regardless of what
 * the current prompt happens to be about.
 *
 * Twelve turns rather than the old twenty raw messages: twenty messages was
 * ten turns at best and, after the relevance filter ran, one to six messages
 * in practice.
 */
export const RECENT_TURNS_ALWAYS_KEPT = 12;

/** Never send fewer than this many turns, even on a tiny context window. */
export const MIN_TURNS_FLOOR = 3;

/**
 * Fraction of the context window held back for the answer when the caller has
 * not asked for a specific output length.
 */
export const DEFAULT_OUTPUT_RESERVE_RATIO = 0.25;

/** Floor and ceiling on the reserve, so the ratio cannot produce absurdities. */
export const MIN_RESERVED_OUTPUT_TOKENS = 1024;
export const MAX_RESERVED_OUTPUT_TOKENS = 32_768;

/**
 * Ceiling on history spend even when the window is enormous.
 *
 * A 1M-token window does not mean a 1M-token prompt is a good idea: it is slow,
 * it is expensive on metered providers, and recall degrades in the middle of
 * very long prompts. Raise deliberately, with a measurement.
 */
export const MAX_HISTORY_INPUT_TOKENS = 96_000;

/**
 * Used when the model catalog has no context window for the selected model.
 * Deliberately small: guessing high truncates at the provider, which fails the
 * whole generation, while guessing low only sends less history.
 */
export const CONSERVATIVE_CONTEXT_WINDOW_TOKENS = 8192;

/** Assumed window for a provider we know is large but whose row is unpopulated. */
export const PROVIDER_DEFAULT_CONTEXT_WINDOW_TOKENS = 32_768;

/** Relevance score at or above which an older turn is retrieved back into P2. */
export const RETRIEVAL_SCORE_THRESHOLD = 0.18;

/** Hybrid relevance weights. They sum to 1. */
export const RELEVANCE_WEIGHTS = Object.freeze({
  lexical: 0.35,
  entity: 0.3,
  decision: 0.2,
  recency: 0.15,
});

/**
 * Tokens shorter than this are ignored when matching, EXCEPT numbers and
 * all-caps identifiers, which are exactly the things users plant and ask about
 * (`7`, `EU`, `ORCHID-731`).
 */
export const MIN_MATCH_TOKEN_LENGTH = 4;

/** Marks a turn as carrying a decision, a constraint or a correction. */
export const DECISION_MARKER_PATTERN =
  /\b(must|never|always|require[ds]?|decided?|decision|choose|chose|chosen|select(ed)?|instead|replace[ds]?|switch(ed)?|actually|correction|prefer(red)?|constraint|policy|rule|standardi[sz]e[d]?|agreed?|final)\b/i;

/** An identifier a user planted: ORCHID-731, MERIDIAN-88, VERDIGRIS-4417. */
export const PLANTED_IDENTIFIER_PATTERN = /\b[A-Z][A-Z0-9]{2,}(?:[-_][A-Z0-9]+)+\b/g;

/** A bare number that is likely a constraint value ("retry seven times", "7"). */
export const NUMERIC_TOKEN_PATTERN = /\b\d{1,7}\b/g;

/**
 * Tokens a message costs beyond its body: the role prefix and the separator.
 *
 * Counting only the body under-reports by 3-5 tokens per message, which across
 * a hundred-message thread is a whole turn of budget the composer thought it
 * had.
 */
export const ROLE_ENVELOPE_TOKENS = 4;
