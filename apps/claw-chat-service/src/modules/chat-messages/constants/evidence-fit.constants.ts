/**
 * Share of the prompt's token budget the research block may take. The rest is
 * the conversation, memories and files - evidence must not crowd those out.
 */
export const EVIDENCE_FIT_BUDGET_SHARE = 0.45;

/**
 * Shares of the model's input window for the other fixed-size sources. With
 * research that is 85%; the rest stays for the system prompt and the chat
 * history. Before this only research was fitted: memories, context packs and
 * files (100k characters each) were counted but never trimmed, so on a small
 * model they alone overflowed the window.
 */
export const FILE_FIT_BUDGET_SHARE = 0.25;
export const CONTEXT_PACK_FIT_BUDGET_SHARE = 0.1;
export const MEMORY_FIT_BUDGET_SHARE = 0.05;

/** Below this a memory, pack item or file excerpt stops being useful. */
export const TEXT_BUDGET_MIN_ITEM_CHARS = 200;

/** Below this a snippet stops being evidence and becomes a headline. */
export const EVIDENCE_FIT_MIN_SNIPPET_CHARS = 240;

/** "[n] " + " — " + newlines around each item. */
export const EVIDENCE_FIT_PER_ITEM_OVERHEAD_CHARS = 12;

/** A shortened history message keeps at least this much, so it still reads as a turn. */
export const HISTORY_MIN_MESSAGE_CHARS = 200;

/**
 * Appended to a text `fitTextsToBudget` shortened. Also how the delivery
 * resolver tells a shortened attachment (TRUNCATED_TEXT) from a whole one.
 */
export const TEXT_BUDGET_SHORTENED_MARKER = "\n[...shortened to fit the model's context window...]";
