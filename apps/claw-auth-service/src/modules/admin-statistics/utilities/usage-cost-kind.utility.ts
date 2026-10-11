import { UsageBillingKind, UsageCostKind } from '../enums/usage-cost-kind.enum';
import {
  type AdminUsageCostSummary,
  type UsageCostCounts,
} from '../types/admin-usage-explorer.types';

/**
 * One kind for an aggregate. A real zero is only ever PRICED. Precedence:
 * any estimate-only row makes the group FALLBACK; otherwise any priced row makes
 * it PRICED; a group with no price at all is UNMETERED only when EVERY unpriced
 * row is an administrator's, else UNPRICED.
 */
export function groupCostKind(counts: UsageCostCounts): UsageCostKind {
  if (counts.fallback > 0) {
    return UsageCostKind.FALLBACK;
  }
  if (counts.priced > 0) {
    return UsageCostKind.PRICED;
  }
  if (counts.unpriced > 0) {
    return UsageCostKind.UNPRICED;
  }
  return counts.unmetered > 0 ? UsageCostKind.UNMETERED : UsageCostKind.PRICED;
}

/**
 * Cost block from the aggregate counts. `costMicroUsd` is actual plus estimate
 * as an integer string (never a float); `partial` flags a figure that
 * understates spend because some rows have no price.
 */
export function toCostSummary(input: {
  actualMicroUsd: string;
  estimatedMicroUsd: string;
  priced: number;
  fallback: number;
  unpriced: number;
  unmetered: number;
}): AdminUsageCostSummary {
  const total = BigInt(input.actualMicroUsd) + BigInt(input.estimatedMicroUsd);
  const missing = input.unpriced + input.unmetered;
  return {
    costMicroUsd: total.toString(),
    actualMicroUsd: input.actualMicroUsd,
    estimatedMicroUsd: input.estimatedMicroUsd,
    costKind: groupCostKind(input),
    pricedRequests: input.priced,
    estimatedRequests: input.fallback,
    unpricedRequests: input.unpriced,
    unmeteredRequests: input.unmetered,
    partial: missing > 0 && input.priced + input.fallback > 0,
  };
}

const COST_KINDS: ReadonlySet<string> = new Set(Object.values(UsageCostKind));
const BILLING_KINDS: ReadonlySet<string> = new Set(Object.values(UsageBillingKind));

export function parseCostKind(raw: string): UsageCostKind {
  return COST_KINDS.has(raw) ? (raw as UsageCostKind) : UsageCostKind.UNPRICED;
}

export function parseBillingKind(raw: string): UsageBillingKind {
  return BILLING_KINDS.has(raw) ? (raw as UsageBillingKind) : UsageBillingKind.PLAN;
}
