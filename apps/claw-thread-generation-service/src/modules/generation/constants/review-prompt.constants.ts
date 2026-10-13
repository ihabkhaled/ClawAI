/** JSON reply the Judge and Critic must return; keys stay English whatever the article language. */
export const REVIEW_REPLY_SHAPE =
  '{"score": integer 0-100, "blockers": string[], "findings": string[] (at most five), "revisionBrief": string}';

/** What a reviewer judges. The article's language is deliberately not on this list. */
export const REVIEW_CRITERIA =
  'Judge only factual support from the supplied evidence, coherence, completeness for the requested publication type, and safety.';
