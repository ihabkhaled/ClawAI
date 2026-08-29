import type { TokenUsage } from '@claw/shared-types';

import { normalizeTokenUsage } from './normalize-token-usage.utility';
import { asRecord, readCount, sumDefinedCounts } from './token-usage-guards.utility';
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
 *
 * Converse prompt caching follows Anthropic rather than OpenAI:
 * `cacheReadInputTokens` and `cacheWriteInputTokens` are reported ALONGSIDE
 * `inputTokens`, not inside it, so the prompt total is reassembled. Only the
 * read half is discounted — a cache write costs more than fresh input.
 */
export function extractBedrockUsage(response: unknown, opts?: ExtractUsageOptions): TokenUsage {
  const root = asRecord(response);
  const usage = asRecord(root?.['usage']);
  const metrics = asRecord(root?.['amazon-bedrock-invocationMetrics']);

  const cacheRead = readCount(usage, 'cacheReadInputTokens');
  const promptTokens =
    sumDefinedCounts(
      readCount(usage, 'inputTokens'),
      cacheRead,
      readCount(usage, 'cacheWriteInputTokens'),
    ) ?? readCount(metrics, 'inputTokenCount');
  const completionTokens =
    readCount(usage, 'outputTokens') ?? readCount(metrics, 'outputTokenCount');

  return normalizeTokenUsage({
    promptTokens,
    completionTokens,
    cachedPromptTokens: cacheRead,
    promptText: opts?.promptText,
    completionText: opts?.completionText,
  });
}
