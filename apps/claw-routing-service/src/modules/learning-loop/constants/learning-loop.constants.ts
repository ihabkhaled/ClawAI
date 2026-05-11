/// Minimum sample size before learned-score updates affect rank.
export const LEARNED_SAMPLE_THRESHOLD = 10;

/// Per-event bounded adjustment to successRate.
export const POSITIVE_DELTA = 0.02;
export const NEGATIVE_DELTA = -0.03;
export const JUDGE_VERIFIED_DELTA = 0.015;
export const JUDGE_REVISED_DELTA = -0.02;
export const JUDGE_ESCALATED_DELTA = -0.04;
export const FALLBACK_TRIGGERED_DELTA = -0.005;

/// Hard floor / ceiling on successRate so no model can be permanently
/// killed or permanently exalted by feedback.
export const SUCCESS_RATE_FLOOR = 0.3;
export const SUCCESS_RATE_CEILING = 0.95;

/// Default starting successRate when no prior data exists.
export const DEFAULT_SUCCESS_RATE = 0.6;
