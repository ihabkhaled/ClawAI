// SCAFFOLD: stream R.1/R.3 (02-r1r3-v2-evaluator-canary)

export type CanaryBucketInput = {
  userId: string;
  orgId?: string;
  canaryPercent: number;
  allowlist?: string[];
  denylist?: string[];
};

export type CanaryBucketResult = {
  isV2: boolean;
  bucketReason: 'percent' | 'allowlist' | 'denylist' | 'rollback_switch_active' | 'flag_off';
};

export type DecisionComparisonInput = {
  v1Decision: { provider: string; model: string; confidence: number; costClass: string };
  v2Decision: { provider: string; model: string; confidence: number; costClass: string };
};

export type DecisionComparisonResult = {
  sameDecision: boolean;
  confidenceDelta: number;
  costClassChange: 'cheaper' | 'same' | 'more_expensive';
};
