/**
 * The one inline-text cap for a user message on every chat surface (rules/59:
 * single chat, compare, consensus, escalation and every lab share it).
 * Several labs used to stop at 10,000, so the same paste worked in chat and
 * failed in a lab. Longer text is not meant to be inline: the composer turns a
 * big paste into a text attachment (ADR-219), which is fitted to the model's
 * window by relevance. Mirrors the frontend's MESSAGE_CONTENT_MAX_CHARS.
 */
export const MESSAGE_CONTENT_MAX_CHARS = 100_000;

export const MESSAGE_CONTENT_MAX_ERROR = `Content must be at most ${String(MESSAGE_CONTENT_MAX_CHARS)} characters`;
