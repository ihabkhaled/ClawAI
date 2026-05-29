import type { TokenUsage } from '@claw/shared-types';

import { normalizeTokenUsage } from './normalize-token-usage.utility';
import { asRecord, readCount } from './token-usage-guards.utility';
import type { ExtractUsageOptions } from './token-usage.types';

/**
 * Extracts a {@link TokenUsage} from an Anthropic Messages API response, which
 * reports `usage.input_tokens` / `usage.output_tokens`.
 *
 * Reads the native fields defensively (response is `unknown`) and delegates to
 * {@link normalizeTokenUsage} for the text-based fallback when usage is absent.
 */
export function extractAnthropicUsage(response: unknown, opts?: ExtractUsageOptions): TokenUsage {
  const usage = asRecord(asRecord(response)?.['usage']);
  return normalizeTokenUsage({
    promptTokens: readCount(usage, 'input_tokens'),
    completionTokens: readCount(usage, 'output_tokens'),
    promptText: opts?.promptText,
    completionText: opts?.completionText,
  });
}
