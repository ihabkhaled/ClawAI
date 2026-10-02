// Anthropic native Messages API transport (F093). Wire literals only; the
// request body lives in chat-execution.manager and the readers in
// utilities/anthropic-messages-response.utility.ts and
// utilities/anthropic-stream-frame.utility.ts.

// `2023-06-01` is the only value Anthropic accepts for this header. It is a
// dated API version, not a feature switch (connector-service keeps the same
// literal in anthropic.constants.ts; the two services do not share a package).
export const ANTHROPIC_API_VERSION = '2023-06-01';
export const ANTHROPIC_VERSION_HEADER = 'anthropic-version';
export const ANTHROPIC_API_KEY_HEADER = 'x-api-key';

// Appended to the connector base URL (`https://api.anthropic.com/v1`).
export const ANTHROPIC_MESSAGES_PATH = '/messages';

// Content-block and stream-event discriminators.
export const ANTHROPIC_BLOCK_TEXT = 'text';
export const ANTHROPIC_BLOCK_THINKING = 'thinking';
export const ANTHROPIC_DELTA_TEXT = 'text_delta';
export const ANTHROPIC_DELTA_THINKING = 'thinking_delta';
export const ANTHROPIC_EVENT_MESSAGE_START = 'message_start';
export const ANTHROPIC_EVENT_CONTENT_BLOCK_DELTA = 'content_block_delta';
export const ANTHROPIC_EVENT_MESSAGE_DELTA = 'message_delta';
export const ANTHROPIC_EVENT_MESSAGE_STOP = 'message_stop';

// Anthropic `stop_reason` -> the OpenAI-style finish reason the rest of the
// pipeline already understands ('length' drives the truncation banner).
export const ANTHROPIC_STOP_REASON_MAP: ReadonlyMap<string, string> = new Map([
  ['end_turn', 'stop'],
  ['stop_sequence', 'stop'],
  ['pause_turn', 'stop'],
  ['max_tokens', 'length'],
  ['tool_use', 'tool_calls'],
]);

// The four usage counters Anthropic reports across `message_start` and
// `message_delta`. `input_tokens` EXCLUDES both cache counters.
export const ANTHROPIC_USAGE_FIELDS = [
  'input_tokens',
  'cache_read_input_tokens',
  'cache_creation_input_tokens',
  'output_tokens',
] as const;
export const ANTHROPIC_DEFAULT_FINISH_REASON = 'stop';
