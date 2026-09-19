/**
 * Share of the prompt's token budget the research block may take. The rest is
 * the conversation, memories and files - evidence must not crowd those out.
 */
export const EVIDENCE_FIT_BUDGET_SHARE = 0.6;

/** Below this a snippet stops being evidence and becomes a headline. */
export const EVIDENCE_FIT_MIN_SNIPPET_CHARS = 240;

/** "[n] " + " — " + newlines around each item. */
export const EVIDENCE_FIT_PER_ITEM_OVERHEAD_CHARS = 12;
