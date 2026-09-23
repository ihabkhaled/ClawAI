/**
 * The health probe for a preset with no key-scoped GET (Perplexity): one
 * completion capped at one token. It costs the provider's per-request fee once
 * per "Test connection" — the only way to prove such a key works.
 */
export const PRESET_HEALTH_PROBE_MAX_TOKENS = 1;

export const PRESET_HEALTH_PROBE_PROMPT = 'ping';

export const PRESET_CHAT_COMPLETIONS_PATH = '/chat/completions';

export const PRESET_BEARER_PREFIX = 'Bearer ';
