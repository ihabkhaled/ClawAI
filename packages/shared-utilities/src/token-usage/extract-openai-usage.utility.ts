import type { TokenUsage } from '@claw/shared-types';

import { normalizeTokenUsage } from './normalize-token-usage.utility';
import { asRecord, readCount, readNestedCount } from './token-usage-guards.utility';
import type { ExtractUsageOptions } from './token-usage.types';

/**
 * Extracts a {@link TokenUsage} from an OpenAI-compatible chat/completions
 * response. Covers OpenAI, xAI/Grok, DeepSeek, and the llama.cpp
 * OpenAI-compatible endpoint — they all expose
 * `usage.prompt_tokens` / `usage.completion_tokens` / `usage.total_tokens`.
 *
 * Cached and reasoning sub-counts live in the detail blocks and are ALREADY
 * INCLUDED in their parent totals, so they pass through unmodified:
 * - `usage.prompt_tokens_details.cached_tokens` ⊆ `prompt_tokens`
 * - `usage.completion_tokens_details.reasoning_tokens` ⊆ `completion_tokens`
 *
 * DeepSeek names the cache hit `prompt_cache_hit_tokens` at the top level of
 * `usage` instead of nesting it; both spellings are accepted so a DeepSeek
 * reasoner is priced on its real cache ratio rather than at the full input rate.
 *
 * Reads the native fields defensively (response is `unknown`) and delegates to
 * {@link normalizeTokenUsage} for the text-based fallback when usage is absent.
 */
export function extractOpenAiCompatibleUsage(
  response: unknown,
  opts?: ExtractUsageOptions,
): TokenUsage {
  const usage = asRecord(asRecord(response)?.['usage']);
  return normalizeTokenUsage({
    promptTokens: readCount(usage, 'prompt_tokens'),
    completionTokens: readCount(usage, 'completion_tokens'),
    cachedPromptTokens:
      readNestedCount(usage, 'prompt_tokens_details', 'cached_tokens') ??
      readCount(usage, 'prompt_cache_hit_tokens'),
    reasoningTokens: readNestedCount(usage, 'completion_tokens_details', 'reasoning_tokens'),
    promptText: opts?.promptText,
    completionText: opts?.completionText,
  });
}
