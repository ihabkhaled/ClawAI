/**
 * Mirrors chat-service's `message-quotes.constants.ts` — the server enforces
 * them; these keep the composer from offering what the server would refuse.
 */
export const QUOTE_MAX_COUNT = 3;
export const QUOTE_MAX_TEXT_LENGTH = 2000;

/** Marks the element whose text can be quoted; the value is the message id. */
export const QUOTE_SOURCE_ATTRIBUTE = 'data-quote-source-id';

/** Where the floating Quote button sits relative to the selection, in px. */
export const QUOTE_BUTTON_OFFSET_PX = 40;

/** No quotes: one shared empty list, so selectors return a stable reference. */
export const EMPTY_COMPOSER_QUOTES: readonly never[] = [];
