import { type AdminUsageTotals } from '@claw/shared-types';

import { type UsageSumsRow } from '../types/admin-usage-analytics.types';

/** Postgres bigint arrives as BigInt; token counts are far below 2^53, so Number is exact. */
export function toCount(value: bigint | number | null | undefined): number {
  return value === null || value === undefined ? 0 : Number(value);
}

/** One aggregate row to the wire shape. Cost stays a decimal string: never a float. */
export function toTotals(row: UsageSumsRow | undefined): AdminUsageTotals {
  return {
    requests: toCount(row?.requests),
    inputTokens: toCount(row?.input_tokens),
    outputTokens: toCount(row?.output_tokens),
    weightedTokens: toCount(row?.weighted_tokens),
    costMicroUsd: row?.cost_micro_usd ?? '0',
  };
}

/** `jane.doe@example.com` to `ja***@example.com`. Admins never need the full address here. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  return at < 1 ? '***' : `${email.slice(0, Math.min(2, at))}***${email.slice(at)}`;
}
