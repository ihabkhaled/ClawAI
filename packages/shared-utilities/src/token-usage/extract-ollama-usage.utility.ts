import type { TokenUsage } from '@claw/shared-types';

import { normalizeTokenUsage } from './normalize-token-usage.utility';
import { asRecord, readCount } from './token-usage-guards.utility';
import type { ExtractUsageOptions } from './token-usage.types';

/**
 * Extracts a {@link TokenUsage} from an Ollama generate/chat response, which
 * reports `prompt_eval_count` (prompt) and `eval_count` (completion) at the top
 * level. Some client wrappers expose the camelCase variants
 * `promptEvalCount` / `evalCount`, so both are accepted.
 *
 * Reads the native fields defensively (response is `unknown`) and delegates to
 * {@link normalizeTokenUsage} for the text-based fallback when counts are
 * absent.
 */
export function extractOllamaUsage(response: unknown, opts?: ExtractUsageOptions): TokenUsage {
  const root = asRecord(response);
  const promptTokens =
    readCount(root, 'prompt_eval_count') ?? readCount(root, 'promptEvalCount');
  const completionTokens = readCount(root, 'eval_count') ?? readCount(root, 'evalCount');

  return normalizeTokenUsage({
    promptTokens,
    completionTokens,
    promptText: opts?.promptText,
    completionText: opts?.completionText,
  });
}
