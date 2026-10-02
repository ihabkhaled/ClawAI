// Reads a buffered Anthropic Messages API response (F093). The usage half is
// NOT read here: `extractAnthropicUsage` in @claw/shared-utilities is the one
// reader of Anthropic's usage fields, because `input_tokens` EXCLUDES the cache
// counters and getting that wrong bills a cached conversation at a fraction of
// its cost.

import {
  ANTHROPIC_API_KEY_HEADER,
  ANTHROPIC_API_VERSION,
  ANTHROPIC_BLOCK_TEXT,
  ANTHROPIC_BLOCK_THINKING,
  ANTHROPIC_DEFAULT_FINISH_REASON,
  ANTHROPIC_MESSAGES_PATH,
  ANTHROPIC_STOP_REASON_MAP,
  ANTHROPIC_VERSION_HEADER,
} from '../constants/anthropic-native-transport.constants';
import type {
  AnthropicMessageContent,
  AnthropicMessagesResponse,
} from '../types/anthropic-message-shape.types';

/** `stop_reason` as the OpenAI-style finish reason the pipeline already uses. */
export function mapAnthropicStopReason(stopReason: string | null | undefined): string {
  return typeof stopReason === 'string' && stopReason.length > 0
    ? (ANTHROPIC_STOP_REASON_MAP.get(stopReason) ?? stopReason)
    : ANTHROPIC_DEFAULT_FINISH_REASON;
}

export function readAnthropicMessageContent(
  response: AnthropicMessagesResponse,
): AnthropicMessageContent {
  const blocks = Array.isArray(response.content) ? response.content : [];
  const text = blocks
    .filter((block) => block.type === ANTHROPIC_BLOCK_TEXT && typeof block.text === 'string')
    .map((block) => block.text ?? '')
    .join('');
  const reasoning = blocks
    .filter(
      (block) => block.type === ANTHROPIC_BLOCK_THINKING && typeof block.thinking === 'string',
    )
    .map((block) => block.thinking ?? '')
    .join('');
  return {
    text,
    reasoning,
    finishReason: mapAnthropicStopReason(response.stop_reason),
    hasContent: Array.isArray(response.content),
  };
}

/** Headers of a native Messages call. The key is the connector's, never a user's. */
export function buildAnthropicNativeHeaders(apiKey: string): Record<string, string> {
  return {
    [ANTHROPIC_API_KEY_HEADER]: apiKey,
    [ANTHROPIC_VERSION_HEADER]: ANTHROPIC_API_VERSION,
  };
}

/** `<connector base URL>/messages`, tolerant of a trailing slash on the base. */
export function buildAnthropicMessagesUrl(baseUrl: string): string {
  const trimmed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${trimmed}${ANTHROPIC_MESSAGES_PATH}`;
}
