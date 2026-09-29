// Anthropic prompt caching (F093). Values are wire literals from the Messages
// API; see utilities/anthropic-prompt-cache.utility.ts for placement.

export const ANTHROPIC_CACHE_CONTROL_TYPE = 'ephemeral';

// Anthropic allows at most four breakpoints per request (a fifth is a 400).
// This lane spends two: the system prompt and the automatic top-level one.
export const ANTHROPIC_MAX_CACHE_BREAKPOINTS = 4;
