import {
  type AdminCreditConnectorUsage,
  type AdminFreeAllowanceUsage,
  type AdminUsageModelLine,
  type AdminUsageToolLine,
  type AdminUsageWorkflowLine,
} from '@claw/shared-types';

import {
  type UsageCreditRow,
  type UsageModelRow,
  type UsageToolRow,
  type UsageWorkflowRow,
} from '../types/admin-usage-analytics.types';
import { ADMIN_USAGE_UNKNOWN_WORKFLOW } from '../constants/admin-usage-analytics.constants';
import { toTotals } from './usage-row-mapper.utility';

export function toModelLine(row: UsageModelRow): AdminUsageModelLine {
  return {
    provider: row.provider,
    model: row.model,
    ...toTotals(row),
    creditRequests: row.credit_requests,
    freeAllowanceRequests: row.free_requests,
  };
}

export function toToolLine(row: UsageToolRow): AdminUsageToolLine {
  return { tool: row.feature, count: row.count };
}

export function toWorkflowLine(row: UsageWorkflowRow): AdminUsageWorkflowLine {
  return { workflow: row.workflow ?? ADMIN_USAGE_UNKNOWN_WORKFLOW, requests: row.requests };
}

export function toCreditConnector(
  credit: UsageCreditRow | undefined,
  freeAllowance: AdminFreeAllowanceUsage,
): AdminCreditConnectorUsage {
  const creditRequests = credit?.credit_requests ?? 0;
  const freeAllowanceRequests = credit?.free_requests ?? 0;
  return {
    usedCreditConnectors: creditRequests > 0 || freeAllowanceRequests > 0,
    creditRequests,
    freeAllowanceRequests,
    walletMicroUsd: credit?.wallet_micro_usd ?? '0',
    freeAllowance,
  };
}

/**
 * The allowance counter as the user sees it. `limit: null` (unlimited) and `0`
 * (disabled) stay distinct, and `remaining` never goes negative.
 */
export function toFreeAllowanceUsage(
  limit: number | null,
  used: number,
  periodKey: string,
  now: Date,
): AdminFreeAllowanceUsage {
  return {
    periodKey,
    limit,
    used,
    remaining: limit === null ? null : Math.max(0, limit - used),
    resetsAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
  };
}
