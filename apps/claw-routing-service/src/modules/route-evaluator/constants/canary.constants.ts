// SCAFFOLD: stream R.1/R.3 (02-r1r3-v2-evaluator-canary)

export const CANARY_HASH_SALT = 'routing-v2-canary';
export const CANARY_ROLLING_WINDOW_REQUESTS = 100;
export const CANARY_ROLLING_WINDOW_MS = 5 * 60 * 1000;
export const CANARY_WARMUP_GRACE_REQUESTS = 50;

export const CANARY_FALLBACK_REASON_INVALID_SCHEMA = 'invalid_schema';
export const CANARY_FALLBACK_REASON_SAFETY = 'safety';
export const CANARY_FALLBACK_REASON_GUARDRAIL_BREACH = 'guardrail_breach';
export const CANARY_FALLBACK_REASON_V2_THREW = 'v2_threw';

export const CANARY_GUARDRAIL_METRIC_REGRESSION = 'regression';
export const CANARY_GUARDRAIL_METRIC_COST_INCREASE = 'cost_increase';
export const CANARY_GUARDRAIL_METRIC_CONFIDENCE_DROP = 'confidence_drop';
export const CANARY_GUARDRAIL_METRIC_FAILURE_RATE = 'failure_rate';
