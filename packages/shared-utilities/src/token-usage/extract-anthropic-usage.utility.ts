import type { TokenUsage } from '@claw/shared-types';

import { normalizeTokenUsage } from './normalize-token-usage.utility';
import { asRecord, readCount, sumDefinedCounts } from './token-usage-guards.utility';
import type { ExtractUsageOptions } from './token-usage.types';

/**
 * Extracts a {@link TokenUsage} from an Anthropic Messages API response, which
 * reports `usage.input_tokens` / `usage.output_tokens`.
 *
 * Anthropic is the exception to the "sub-count is included in the parent" rule:
 * `input_tokens` EXCLUDES both cache fields, so the prompt total has to be
 * reassembled:
 *
 *     promptTokens = input_tokens + cache_read_input_tokens + cache_creation_input_tokens
 *
 * Taking `input_tokens` alone would under-report a cached conversation by the
 * whole cached prefix — which on a long thread is most of the prompt.
 *
 * Only `cache_read_input_tokens` counts as `cachedPromptTokens`. A cache WRITE
 * is billed at a premium over normal input, not a discount, so folding it into
 * the cheap bucket would under-charge it. It is reported separately as
 * `cacheCreationPromptTokens` (F093); the cost calculator prices it at
 * `cacheWritePerMillionMicroUsd` when that rate is published and at the plain
 * input rate when it is not, so an unpublished rate never makes a write free.
 *
 * Extended thinking is billed inside `output_tokens` with no separate field, so
 * `reasoningTokens` is left unreported rather than guessed.
 */
export function extractAnthropicUsage(response: unknown, opts?: ExtractUsageOptions): TokenUsage {
  const usage = asRecord(asRecord(response)?.['usage']);
  const cacheRead = readCount(usage, 'cache_read_input_tokens');
  const cacheWrite = readCount(usage, 'cache_creation_input_tokens');

  return normalizeTokenUsage({
    promptTokens: sumDefinedCounts(readCount(usage, 'input_tokens'), cacheRead, cacheWrite),
    completionTokens: readCount(usage, 'output_tokens'),
    cachedPromptTokens: cacheRead,
    cacheCreationPromptTokens: cacheWrite,
    promptText: opts?.promptText,
    completionText: opts?.completionText,
  });
}
