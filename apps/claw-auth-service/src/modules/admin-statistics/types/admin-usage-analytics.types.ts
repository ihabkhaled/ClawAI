import { type AdminUsageBucketGrain } from '@claw/shared-types';

/** A validated, capped, half-open `[from, to)` window. */
export type AdminUsageRange = {
  from: Date;
  to: Date;
  grain: AdminUsageBucketGrain;
};

/** What a caller may send before it is resolved against "now". */
export type AdminUsageRangeInput = {
  hours?: number | undefined;
  from?: string | undefined;
  to?: string | undefined;
};

/** Aggregate columns every grouped query returns. BigInt: Postgres bigint comes back as one. */
export type UsageSumsRow = {
  requests: number;
  input_tokens: bigint;
  output_tokens: bigint;
  weighted_tokens: bigint;
  cost_micro_usd: string;
  tool_calls: bigint;
};

export type UsageModelRow = UsageSumsRow & {
  provider: string;
  model: string;
  credit_requests: number;
  free_requests: number;
  wallet_micro_usd: string;
};

export type UsageCreditRow = {
  credit_requests: number;
  free_requests: number;
  wallet_micro_usd: string;
};

export type UsageUserRow = UsageSumsRow & { user_id: string };
export type UsageBucketRow = UsageSumsRow & { bucket_start: Date };
export type UsageWorkflowRow = { workflow: string | null; requests: number };
export type UsageToolRow = { feature: string; count: number };
export type UsageActiveUsersRow = { active_users: number };

export type UsageQueryScope = {
  userId: string | null;
  from: Date;
  to: Date;
};
