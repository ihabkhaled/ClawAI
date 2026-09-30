// Anthropic prompt caching (F093) — the request half. The billing half already
// existed: extractAnthropicUsage reports `cache_read_input_tokens` as
// `cachedPromptTokens`, and the credit path prices it at the cache-read rate.
// Until this utility nothing ever asked for a cache, so those counters were
// always zero.
//
// Placement, within Anthropic's four-breakpoint budget:
//   1. the system prompt, converted to block form and marked — stable across
//      every turn of every thread, so a new thread reads it too;
//   2. one automatic top-level breakpoint, which the API puts on the last
//      cacheable block and moves forward each turn, so turn N reads turns 1..N-1.
//
// Privacy boundary: Anthropic isolates caches per organisation (the connector's
// API key) and a hit needs a byte-identical prefix, so one user cannot read
// another's conversation from the cache without already holding its exact
// bytes. Nothing user-specific is added to the prefix here.
//
// A prefix under the model's minimum (512-4096 tokens) is silently not cached —
// no error, `cache_creation_input_tokens: 0` — so short chats are unaffected.
//
// Pure: returns a new body, never mutates the input.

import type { AnthropicMessagesRequest } from '../types/execution.types';
import type {
  AnthropicCacheControl,
  AnthropicSystemTextBlock,
} from '../types/anthropic-message-shape.types';
import { ANTHROPIC_CACHE_CONTROL_TYPE } from '../constants/anthropic-prompt-cache.constants';

function ephemeral(): AnthropicCacheControl {
  return { type: ANTHROPIC_CACHE_CONTROL_TYPE };
}

function markSystem(
  system: AnthropicMessagesRequest['system'],
): AnthropicSystemTextBlock[] | undefined {
  if (system === undefined) {
    return undefined;
  }
  const blocks: AnthropicSystemTextBlock[] =
    typeof system === 'string' ? [{ type: 'text', text: system }] : system.map((b) => ({ ...b }));
  const nonEmpty = blocks.filter((block) => block.text.length > 0);
  const last = nonEmpty.at(-1);
  if (last === undefined) {
    return undefined;
  }
  last.cache_control = ephemeral();
  return nonEmpty;
}

export function applyAnthropicPromptCache(
  request: AnthropicMessagesRequest,
): AnthropicMessagesRequest {
  const cached: AnthropicMessagesRequest = { ...request, cache_control: ephemeral() };
  const system = markSystem(request.system);
  if (system === undefined) {
    delete cached.system;
  } else {
    cached.system = system;
  }
  return cached;
}
