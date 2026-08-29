import type { RawTokenBreakdown, TokenUsage } from '@claw/shared-types';

import type { BillableCallCounts } from './weighted-tokens.types';

/**
 * Converts a provider-normalized {@link TokenUsage} into the
 * {@link RawTokenBreakdown} the cost calculator prices.
 *
 * The two shapes disagree on purpose, and getting the difference wrong
 * double-charges every request:
 *
 * - `TokenUsage` reports TOTALS with the discounted/expensive parts marked as
 *   SUBSETS (`cachedPromptTokens ⊆ promptTokens`,
 *   `reasoningTokens ⊆ completionTokens`). That is what reporting and the token
 *   ledger want — "how many tokens did this call use".
 * - `RawTokenBreakdown` is priced by `calculateCostMicroUsd`, which ADDS its
 *   four token fields at four different rates. Its `inputTokens` therefore has
 *   to mean "prompt tokens that were NOT cached" and its `outputTokens`
 *   "completion tokens that were NOT reasoning" — otherwise the cached and
 *   reasoning tokens are billed twice.
 *
 * Subtraction cannot go negative: `normalizeTokenUsage` clamps each subset to
 * its parent. `Math.max(0, …)` is kept as a second guard so a hand-built
 * `TokenUsage` from a test or an older persisted row cannot produce a negative
 * count, which `calculateCostMicroUsd` would reject with a `MoneyError`.
 */
export function toRawTokenBreakdown(
  usage: TokenUsage,
  calls: BillableCallCounts = {},
): RawTokenBreakdown {
  const cachedInputTokens = Math.max(0, usage.cachedPromptTokens);
  const reasoningTokens = Math.max(0, usage.reasoningTokens);

  return {
    inputTokens: Math.max(0, usage.promptTokens - cachedInputTokens),
    cachedInputTokens,
    reasoningTokens,
    outputTokens: Math.max(0, usage.completionTokens - reasoningTokens),
    toolCalls: Math.max(0, calls.toolCalls ?? 0),
    searchCalls: Math.max(0, calls.searchCalls ?? 0),
    imageUnits: Math.max(0, calls.imageUnits ?? 0),
  };
}

/**
 * The breakdown for a call that produced no measurable usage at all — a request
 * that failed before the provider answered.
 *
 * Deliberately explicit rather than a bare `{}`: a released reservation still
 * has to write a ledger row, and a row with absent counts is indistinguishable
 * from a row that was never written.
 */
export function emptyTokenBreakdown(): RawTokenBreakdown {
  return {
    inputTokens: 0,
    cachedInputTokens: 0,
    reasoningTokens: 0,
    outputTokens: 0,
    toolCalls: 0,
    searchCalls: 0,
    imageUnits: 0,
  };
}
