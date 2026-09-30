import {
  USAGE_BREAKDOWN_MAX_LINES,
  USAGE_UNATTRIBUTED_SURFACE,
} from '../constants/usage-attribution.constants';
import {
  type UsageAggregateRow,
  type UsageMemberLine,
  type UsageModelLine,
  type UsageSurfaceLine,
  type UsageTotals,
} from '../types/usage-attribution.types';

function totalsOf(row: UsageTotals): UsageTotals {
  return {
    requests: row.requests,
    weightedTokens: row.weightedTokens,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
  };
}

function largestFirst<T extends UsageTotals>(lines: T[]): T[] {
  return [...lines]
    .sort((a, b) => b.weightedTokens - a.weightedTokens || b.requests - a.requests)
    .slice(0, USAGE_BREAKDOWN_MAX_LINES);
}

/** Integer sum of every row. Taken before any line is cut, so it is exact. */
export function sumUsageRows(rows: UsageAggregateRow[]): UsageTotals {
  return rows.reduce<UsageTotals>(
    (sum, row) => ({
      requests: sum.requests + row.requests,
      weightedTokens: sum.weightedTokens + row.weightedTokens,
      inputTokens: sum.inputTokens + row.inputTokens,
      outputTokens: sum.outputTokens + row.outputTokens,
    }),
    { requests: 0, weightedTokens: 0, inputTokens: 0, outputTokens: 0 },
  );
}

export function surfaceLines(rows: UsageAggregateRow[]): UsageSurfaceLine[] {
  return largestFirst(
    rows.map((row) => ({
      surface: row.key['workflow'] ?? USAGE_UNATTRIBUTED_SURFACE,
      ...totalsOf(row),
    })),
  );
}

export function modelLines(rows: UsageAggregateRow[]): UsageModelLine[] {
  return largestFirst(
    rows.map((row) => ({
      provider: row.key['provider'] ?? '',
      model: row.key['model'] ?? '',
      ...totalsOf(row),
    })),
  );
}

export function memberLines(rows: UsageAggregateRow[]): UsageMemberLine[] {
  return largestFirst(rows.map((row) => ({ userId: row.key['userId'] ?? '', ...totalsOf(row) })));
}
