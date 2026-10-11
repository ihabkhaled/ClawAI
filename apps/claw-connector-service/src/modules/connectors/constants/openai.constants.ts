export const OPENAI_DEFAULT_BASE_URL = 'https://api.openai.com/v1';
/** A listed id is a candidate chat model when it is `gpt-*`, `chatgpt*` or an `o<digit>` reasoning model. */
export const OPENAI_CHAT_MODEL_INCLUDE_PATTERN = /^(?:gpt-|chatgpt|o\d)/u;

/**
 * Non-chat families OpenAI lists in /v1/models. A deny-list (not an allow-list
 * of versions) so new families such as gpt-6 or gpt-luna appear without a code
 * change. Chat-capable `-tts`, `-transcribe`, `-realtime` and `-audio` ids stay:
 * the audio heuristics read them.
 */
export const OPENAI_NON_CHAT_MODEL_PATTERN =
  /embedding|whisper|^tts-|dall-e|gpt-image|moderation|^sora|^babbage|^davinci/u;

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
