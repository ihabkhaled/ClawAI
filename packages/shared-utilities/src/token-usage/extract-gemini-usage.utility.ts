import type { TokenUsage } from '@claw/shared-types';

import { normalizeTokenUsage } from './normalize-token-usage.utility';
import { asRecord, readCount, sumDefinedCounts } from './token-usage-guards.utility';
import type { ExtractUsageOptions } from './token-usage.types';

/**
 * Extracts a {@link TokenUsage} from a Google Gemini
 * `generateContent` response, which reports counts under `usageMetadata`:
 * `promptTokenCount` / `candidatesTokenCount` / `totalTokenCount`.
 *
 * Two Gemini-specific shapes matter for pricing:
 * - `cachedContentTokenCount` IS included in `promptTokenCount`, so it passes
 *   through as the discounted subset.
 * - `thoughtsTokenCount` (Gemini 2.5 thinking) is NOT included in
 *   `candidatesTokenCount` — it is only counted in `totalTokenCount`. So the
 *   completion total has to be reassembled:
 *
 *       completionTokens = candidatesTokenCount + thoughtsTokenCount
 *
 *   Reading `candidatesTokenCount` alone is what made a thinking model look
 *   cheap: on a hard prompt the thoughts routinely exceed the answer.
 */
export function extractGeminiUsage(response: unknown, opts?: ExtractUsageOptions): TokenUsage {
  const metadata = asRecord(asRecord(response)?.['usageMetadata']);
  const thoughts = readCount(metadata, 'thoughtsTokenCount');

  return normalizeTokenUsage({
    promptTokens: readCount(metadata, 'promptTokenCount'),
    completionTokens: sumDefinedCounts(readCount(metadata, 'candidatesTokenCount'), thoughts),
    cachedPromptTokens: readCount(metadata, 'cachedContentTokenCount'),
    reasoningTokens: thoughts,
    promptText: opts?.promptText,
    completionText: opts?.completionText,
  });
}
