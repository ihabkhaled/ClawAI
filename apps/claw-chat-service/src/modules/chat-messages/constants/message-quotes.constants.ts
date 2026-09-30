/**
 * Quote limits (chat-supremacy Batch 2). A quote is a pointer plus the words
 * the user wants discussed, not a way to re-send a whole transcript: three
 * selections of up to 2,000 characters keep the turn legible and bounded.
 */
export const QUOTE_MAX_COUNT = 3;
export const QUOTE_MAX_TEXT_LENGTH = 2000;

/** Heading the model reads above quoted text on a turn. */
export const QUOTED_CONTEXT_HEADING = 'The user is replying to this part of the conversation:';
