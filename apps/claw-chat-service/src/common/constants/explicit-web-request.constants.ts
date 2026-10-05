/**
 * Plain-language orders to use the internet, used ONLY as a backstop when no
 * classifier model could answer. The model stays the decision maker; these
 * exist so "please search internet for X" is never answered "I cannot search
 * the internet" just because the classifier was down.
 *
 * Narrow on purpose: a verb that orders a lookup AND a web word. Ordinary
 * chat ("summarise the latest version of my essay") matches neither pair.
 */
export const EXPLICIT_WEB_VERB_PATTERN =
  /\b(search|look\s?up|look it up|find|check|browse|research)\b/i;
export const EXPLICIT_WEB_PLACE_PATTERN = /\b(internet|web|online)\b/i;

/** Complete phrases that order a lookup on their own. */
export const EXPLICIT_WEB_PHRASE_PATTERNS: readonly RegExp[] = [
  /\bgoogle (it|this|that|for)\b/i,
  /\bsearch (on )?(google|bing|duckduckgo)\b/i,
];
