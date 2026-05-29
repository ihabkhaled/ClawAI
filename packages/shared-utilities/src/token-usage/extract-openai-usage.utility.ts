import type { TokenUsage } from '@claw/shared-types';

import { normalizeTokenUsage } from './normalize-token-usage.utility';
import { asRecord, readCount } from './token-usage-guards.utility';
import type { ExtractUsageOptions } from './token-usage.types';

/**
 * Extracts a {@link TokenUsage} from an OpenAI-compatible chat/completions
 * response. Covers OpenAI, xAI/Grok, DeepSeek, and the llama.cpp
 * OpenAI-compatible endpoint — they all expose
 * `usage.prompt_tokens` / `usage.completion_tokens` / `usage.total_tokens`.
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
    promptText: opts?.promptText,
    completionText: opts?.completionText,
  });
}
