/**
 * Deterministic crawl-intent phrases, matched against the raw message
 * (case-insensitive), not a search query — the same "an INTENT is not a
 * QUERY" distinction rule 41 item 10 already makes. Deliberately small and
 * literal rather than a general NLP classifier: false positives are
 * expensive (a normal SEARCH_THEN_FETCH silently becoming a 20-page crawl),
 * so this only upgrades on language that unambiguously asks for a whole
 * site, and only when the message also contains a URL — see
 * `classifyResearchWorkflow`.
 */
export const CRAWL_INTENT_PATTERNS: readonly RegExp[] = [
  /\bcrawl\b/i,
  /\baudit (this|the) (site|website)\b/i,
  /\bmap (this|the) (site|website)\b/i,
];

/** Cheap presence check, not full URL parsing — research-service's own `detectUrlsInText` is the actual validator once the request arrives there. */
export const BARE_URL_PATTERN = /https?:\/\//i;
