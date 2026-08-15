export const EDUCATION_WINDOW_DAYS = 30;
export const MIN_PROFILE_SAMPLE_SIZE = 2;
export const CALIBRATION_BLEND = 0.3;

// V5 learning evolution (ADR-069) ─────────────────────────────────────────

/** Z-score for a 95% Wilson score confidence interval around successRate. */
export const CONFIDENCE_INTERVAL_Z_SCORE = 1.96;

/**
 * Outlier control for latency/cost aggregation. A statistical approach (e.g.
 * median absolute deviation) needs several samples before it can tell an
 * outlier apart from ordinary spread — with only one or two observations in
 * a bucket (the common case for a freshly-seen model/task pairing) it
 * mathematically cannot, since two points are always equidistant from their
 * own median. A fixed domain ceiling instead bounds every single sample
 * unconditionally, regardless of how many other observations exist, which is
 * what actually stops the pack's example — "a 60-second latency spike" — from
 * dominating a thin window. Samples are winsorized (clamped), never dropped:
 * every observation still counts toward the sample size and the weighted
 * average, just not at its raw, possibly-anomalous value.
 */
export const MAX_LATENCY_OUTLIER_MS = 30_000;

/** Same rationale as MAX_LATENCY_OUTLIER_MS, for actualCostEstimate (USD). */
export const MAX_COST_OUTLIER_ESTIMATE = 5;

/** Sentinel for RoutingOutcomeRecord.evaluatorVersion === null when rolling
 * observations up into RouterModelProfile.evaluatorVersions /
 * RouterTopicProfile.evaluatorVersions — keeps the raw column honestly
 * nullable while the aggregate always reports an attributable value. */
export const UNVERSIONED_EVALUATOR = 'unversioned';
