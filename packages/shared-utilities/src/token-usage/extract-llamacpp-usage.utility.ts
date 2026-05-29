import type { TokenUsage } from '@claw/shared-types';

import { normalizeTokenUsage } from './normalize-token-usage.utility';
import { asRecord, readCount } from './token-usage-guards.utility';
import type { ExtractUsageOptions } from './token-usage.types';

/**
 * Extracts a {@link TokenUsage} from a llama.cpp server response. The server
 * supports two shapes:
 * - OpenAI-compatible (`/v1/chat/completions`):
 *   `usage.prompt_tokens` / `usage.completion_tokens`
 * - Native completion endpoint (`/completion`):
 *   `tokens_evaluated` (prompt) / `tokens_predicted` (completion)
 *
 * The OpenAI-compatible usage block is preferred; the native runtime fields are
 * used as a secondary native source. Reads everything defensively (response is
 * `unknown`) and delegates to {@link normalizeTokenUsage} for the text-based
 * fallback.
 */
export function extractLlamacppUsage(response: unknown, opts?: ExtractUsageOptions): TokenUsage {
  const root = asRecord(response);
  const usage = asRecord(root?.['usage']);

  const promptTokens =
    readCount(usage, 'prompt_tokens') ?? readCount(root, 'tokens_evaluated');
  const completionTokens =
    readCount(usage, 'completion_tokens') ?? readCount(root, 'tokens_predicted');

  return normalizeTokenUsage({
    promptTokens,
    completionTokens,
    promptText: opts?.promptText,
    completionText: opts?.completionText,
  });
}
