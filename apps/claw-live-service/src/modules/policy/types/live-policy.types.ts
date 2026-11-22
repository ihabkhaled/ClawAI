import type { z } from 'zod';

import type {
  liveModelRefSchema,
  livePlanPolicySchema,
  livePolicySchema,
} from '../schemas/live-policy.schema';

export type LivePolicy = z.infer<typeof livePolicySchema>;
export type LivePlanPolicy = z.infer<typeof livePlanPolicySchema>;
export type LiveModelRef = z.infer<typeof liveModelRefSchema>;

export interface ActiveLivePolicy {
  version: number;
  config: LivePolicy;
}
