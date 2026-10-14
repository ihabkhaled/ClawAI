/** JSON reply the Judge and Critic must return; keys stay English whatever the article language. */
export const REVIEW_REPLY_SHAPE =
  '{"score": integer 0-100, "blockers": string[] (each under 250 characters), "findings": string[] (at most five, each under 250 characters), "revisionBrief": string (under 900 characters)}';

/** What a reviewer judges. The article's language is deliberately not on this list. */
export const REVIEW_CRITERIA =
  'Judge only factual support from the supplied evidence, coherence, completeness for the requested publication type, and safety.';

/** Longest finding or blocker kept after parsing; shorter than the prompt's 250 so nothing is cut twice. */
export const REVIEW_TEXT_MAX_CHARS = 280;
