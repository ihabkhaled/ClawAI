import { type UsageAggregateRow, type UsageGroupedSums } from '../types/usage-attribution.types';

/** One grouped ledger row as integer counts; a null sum is a zero. */
export function toUsageAggregateRow(
  key: Record<string, string | null>,
  sums: UsageGroupedSums,
): UsageAggregateRow {
  return {
    key,
    requests: sums._count._all,
    weightedTokens: sums._sum.weightedTokens ?? 0,
    inputTokens: sums._sum.rawInputTokens ?? 0,
    outputTokens: sums._sum.rawOutputTokens ?? 0,
  };
}
