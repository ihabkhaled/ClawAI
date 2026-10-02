export const OPENAI_DEFAULT_BASE_URL = 'https://api.openai.com/v1';
export const OPENAI_CHAT_MODEL_PREFIXES = [
  'gpt-5',
  'gpt-4',
  'gpt-3.5',
  'o1',
  'o3',
  'o4',
  'chatgpt',
];

/**
 * OpenAI models served ONLY by POST /v1/responses. On /v1/chat/completions they
 * answer 404 ("only supported in v1/responses" or, for the pro family, "not a
 * chat model"). chat-service speaks chat/completions only, so these are synced
 * as kind TOOL: never offered in the chat picker, never routed a chat turn.
 * Matched against the lower-cased model id.
 */
export const OPENAI_RESPONSES_ONLY_PATTERNS: readonly RegExp[] = [
  /-pro$/,
  /-pro-\d{4}-\d{2}-\d{2}$/,
  /-codex(-|$)/,
  /deep-research/,
];

// Models OpenAI still LISTS in /v1/models but no longer serves (ADR-151). Each
// answers 404 `model_not_found` ("has been deprecated") or is a legacy
// completions / responses-only deployment the chat path cannot call. The sync
// records them as SUNSET so they are never offered to chat; the learned path
// (chat-service reports model_not_found) catches the next one before this list
// does.
export const OPENAI_RETIRED_MODEL_PATTERNS: readonly RegExp[] = [
  /-instruct(?:-|$)/u,
  /-search-preview(?:-|$)/u,
  /-chat-latest$/u,
  /-codex(?:-|$)/u,
  /^gpt-3\.5-turbo-1106$/u,
];
