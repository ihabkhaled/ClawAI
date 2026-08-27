/**
 * The most matches an in-thread search returns.
 *
 * A jump-to list is scanned, not read: past this many entries the user scrolls
 * the results instead of the conversation, which is the thing they were trying
 * to avoid.
 */
export const MAX_IN_THREAD_SEARCH_RESULTS = 100;

/**
 * Characters of context kept around a match in the preview.
 *
 * Enough to recognise the sentence, short enough that fifty previews still fit
 * on a phone.
 */
export const SEARCH_SNIPPET_RADIUS = 60;
