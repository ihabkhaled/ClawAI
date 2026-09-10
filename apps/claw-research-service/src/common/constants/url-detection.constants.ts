/**
 * Recognising a URL the user typed, so it can be OPENED rather than searched
 * for.
 *
 * Until 2026-09-10 there was no such step anywhere in the platform. A prompt
 * like `summarize https://example.com/post` became a keyword *search query that
 * happened to contain a URL*: the search engine returned whatever it returned,
 * and the top few of THOSE were fetched. The page the user named was opened
 * only if the search engine happened to surface it. The fetcher, its SSRF
 * guard, its domain policy and its cache were all real — they were simply never
 * reachable from a URL a person wrote.
 */

/**
 * `http`/`https` only, and deliberately so.
 *
 * `javascript:`, `data:`, `file:` and `vbscript:` are listed separately below
 * rather than being "not matched by accident": a reviewer should be able to see
 * that the exclusion is a decision. Trailing punctuation is trimmed by the
 * detector, because a sentence usually ends after a pasted link.
 */
export const HTTP_URL_PATTERN = /https?:\/\/[^\s<>"'`]+/giu;

/** Schemes that must never be fetched, whatever else changes here. */
export const UNSAFE_URL_SCHEMES: ReadonlyArray<string> = [
  'javascript:',
  'data:',
  'file:',
  'vbscript:',
] as const;

/**
 * Characters stripped from the end of a match.
 *
 * `https://example.com/post.` and `(https://example.com/post)` are what people
 * actually type. Kept as a closed list rather than a regex class so the
 * intent — sentence punctuation, not URL syntax — stays readable.
 */
export const URL_TRAILING_PUNCTUATION: ReadonlyArray<string> = [
  '.',
  ',',
  ';',
  ':',
  '!',
  '?',
  ')',
  ']',
  '}',
  '>',
  '"',
  "'",
] as const;

/**
 * How many pasted URLs one run will open.
 *
 * A bound, not a preference: a prompt can contain a hundred links, and each
 * fetch is a network round trip and a cache write. Three matches
 * `EVIDENCE_FETCH_TOP_N`, so a run that opens the user's links costs no more
 * than one that opens the search engine's.
 */
export const DIRECT_FETCH_MAX_URLS = 3;

/** Longest URL accepted, matching the fetch DTO's own cap. */
export const URL_MAX_LENGTH = 2048;

/**
 * Confidence given to a page the user explicitly named.
 *
 * The evidence bundle sorts by confidence and then caps the list, so a pasted
 * link scoring like an ordinary search hit could be trimmed out of the very
 * bundle it was the point of. The ceiling is the only score that cannot be
 * outranked by something the user did not ask for.
 */
export const DIRECT_FETCH_CONFIDENCE = 1;
