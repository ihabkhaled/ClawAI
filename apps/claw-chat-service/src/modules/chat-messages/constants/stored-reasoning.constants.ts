/**
 * How much streamed reasoning is kept on the assistant message.
 *
 * Reasoning rides in the message's JSONB metadata, which is read on every
 * message page load — and a reasoning model can emit several times more
 * thinking than answer. This bounds what a single turn can cost every
 * subsequent read of the thread.
 *
 * Truncation is visible, not silent: the stored value ends in an ellipsis so a
 * reader can tell there was more.
 */
export const MAX_STORED_REASONING_CHARS = 20_000;
