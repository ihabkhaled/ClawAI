import type { TokenUsage } from '@claw/shared-types';

import { normalizeTokenUsage } from './normalize-token-usage.utility';
import { asRecord, readCount } from './token-usage-guards.utility';
import type { ExtractUsageOptions } from './token-usage.types';

/**
 * Extracts a {@link TokenUsage} from an AWS Bedrock response. Bedrock exposes
 * usage in two shapes depending on the API/model:
 * - Converse-style: `usage.inputTokens` / `usage.outputTokens`
 * - Streaming invoke metrics:
 *   `amazon-bedrock-invocationMetrics.inputTokenCount` / `outputTokenCount`
 *
 * The Converse shape is preferred; the invocation-metrics shape is used as a
 * secondary native source. Reads everything defensively (response is `unknown`)
 * and delegates to {@link normalizeTokenUsage} for the text-based fallback.
 */
export function extractBedrockUsage(response: unknown, opts?: ExtractUsageOptions): TokenUsage {
  const root = asRecord(response);
  const usage = asRecord(root?.['usage']);
  const metrics = asRecord(root?.['amazon-bedrock-invocationMetrics']);

  const promptTokens =
    readCount(usage, 'inputTokens') ?? readCount(metrics, 'inputTokenCount');
  const completionTokens =
    readCount(usage, 'outputTokens') ?? readCount(metrics, 'outputTokenCount');

  return normalizeTokenUsage({
    promptTokens,
    completionTokens,
    promptText: opts?.promptText,
    completionText: opts?.completionText,
  });
}
