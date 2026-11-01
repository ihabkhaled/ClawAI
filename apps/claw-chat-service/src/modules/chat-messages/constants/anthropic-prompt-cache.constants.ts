// Anthropic prompt caching (F093). Values are wire literals from the Messages
// API; see utilities/anthropic-prompt-cache.utility.ts for placement.

export const ANTHROPIC_CACHE_CONTROL_TYPE = 'ephemeral';

// Anthropic allows at most four breakpoints per request (a fifth is a 400).
// This lane spends two: the system prompt and the automatic top-level one.
export const ANTHROPIC_MAX_CACHE_BREAKPOINTS = 4;

// Hold sizing for a cached tool-carrying call. JSON (tool schemas, tool
// results) tokenizes near 2.5 bytes per token, not the four of prose, and a
// hold that is too small is absorbed by the platform (settlement is min).
export const CACHED_JSON_BYTES_PER_TOKEN = 2.5;
// Anthropic adds a hidden tool-use system prompt when tools are sent.
export const CACHED_TOOL_PROMPT_MARGIN_TOKENS = 400;
