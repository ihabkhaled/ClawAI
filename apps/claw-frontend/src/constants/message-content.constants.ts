/**
 * The inline-text cap for one message on every chat surface. Mirrors
 * chat-service's MESSAGE_CONTENT_MAX_CHARS (rules/59: one pipeline, one cap).
 * Longer text goes in as a pasted-text attachment (ADR-219).
 */
export const MESSAGE_CONTENT_MAX_CHARS = 100_000;
