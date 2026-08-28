/** Longest title we will derive. Past this the list truncates it anyway. */
export const THREAD_TITLE_MAX_LENGTH = 60;

/**
 * Below this, cutting at a word boundary has taken too much and a hard cut at
 * the limit reads better than three words and an ellipsis.
 */
export const THREAD_TITLE_MIN_WORD_BOUNDARY = 24;

/**
 * How many messages to scan for the opening turn.
 *
 * The first row is normally the user's, but a thread can open with a system or
 * tool row, and a research run writes a placeholder before the answer. A small
 * window finds the real opening without reading the whole conversation.
 */
export const THREAD_TITLE_SCAN_LIMIT = 5;

/** Marks a title that was cut, so a reader knows the sentence continues. */
export const THREAD_TITLE_ELLIPSIS = '…';
