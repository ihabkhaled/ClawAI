import type { TokenUsage } from '@claw/shared-types';

import { normalizeTokenUsage } from './normalize-token-usage.utility';
import { asRecord, readCount } from './token-usage-guards.utility';
import type { ExtractUsageOptions } from './token-usage.types';

/**
 * Extracts a {@link TokenUsage} from a Google Gemini
 * `generateContent` response, which reports counts under `usageMetadata`:
 * `promptTokenCount` / `candidatesTokenCount` / `totalTokenCount`.
 *
 * Reads the native fields defensively (response is `unknown`) and delegates to
 * {@link normalizeTokenUsage} for the text-based fallback when metadata is
 * absent.
 */
export function extractGeminiUsage(response: unknown, opts?: ExtractUsageOptions): TokenUsage {
  const metadata = asRecord(asRecord(response)?.['usageMetadata']);
  return normalizeTokenUsage({
    promptTokens: readCount(metadata, 'promptTokenCount'),
    completionTokens: readCount(metadata, 'candidatesTokenCount'),
    promptText: opts?.promptText,
    completionText: opts?.completionText,
  });
}
