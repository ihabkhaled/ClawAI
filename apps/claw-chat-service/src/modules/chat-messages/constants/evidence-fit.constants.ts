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

/**
 * The untrusted fence around each item (research engine B1): `<web_source n="NNN" url="` + `" trust="untrusted">`,
 * the `Title: ` line, the closing `</web_source>` and the line breaks, before the URL, title and text it wraps.
 * Was 12 for the old `[n] title — url` line; an undersized overhead let a 150-page crawl overflow an 8k model.
 */
export const EVIDENCE_FIT_PER_ITEM_OVERHEAD_CHARS = 72;

/** A shortened history message keeps at least this much, so it still reads as a turn. */
export const HISTORY_MIN_MESSAGE_CHARS = 200;

/**
 * Appended to a text `fitTextsToBudget` shortened. Also how the delivery
 * resolver tells a shortened attachment (TRUNCATED_TEXT) from a whole one.
 */
export const TEXT_BUDGET_SHORTENED_MARKER = "\n[...shortened to fit the model's context window...]";

/**
 * Opens a file text that was fitted by relevance because it is larger than the
 * model's file share (ADR-219). The delivery resolver reads this prefix to
 * record the file as TRUNCATED_TEXT with the "fitted by relevance" reason, so
 * keep it stable and distinctive.
 */
export const FILE_RELEVANCE_FIT_NOTE_PREFIX = '[ClawAI note — large file: ';

/**
 * The rest of the note. The model must know it sees part of the file, or it
 * answers as if it had read everything. {SHOWN} and {TOTAL} are formatted
 * character counts.
 */
export const FILE_RELEVANCE_FIT_NOTE_BODY =
  "showing about {SHOWN} of {TOTAL} characters. The file is larger than this model's context window, " +
  'so you see its opening and the passages most relevant to the question, in document order; ' +
  '"[…]" marks skipped text. Do not claim to have read the whole file: say you used the most relevant ' +
  'parts, and if the answer is not in them, suggest a more specific question.]\n';

/** Room kept free for the note per file, so the note never pushes a file past its budget. */
export const FILE_RELEVANCE_FIT_NOTE_RESERVE_CHARS = 512;
