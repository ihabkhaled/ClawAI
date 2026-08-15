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

// V6 learning evolution (ADR-070) ─────────────────────────────────────────

/**
 * A workspace prior below this route count has not earned any pull on a
 * decision's confidence yet — same cold-start-instability guard as
 * MIN_PROFILE_SAMPLE_SIZE, kept as its own constant because the workspace
 * tier is a secondary signal layered on a smaller, per-workspace sample
 * than the global tier's whole-fleet sample, so the bar is deliberately
 * lower.
 */
export const MIN_WORKSPACE_PRIOR_SAMPLE_SIZE = 3;

/** Route count at which a workspace prior's confidence ramp reaches 1.0. */
export const WORKSPACE_PRIOR_CONFIDENCE_RAMP_SAMPLES = 10;

/**
 * How much weight a workspace prior gets in the nudge, scaled further by the
 * prior's own confidence ramp. Deliberately well below CALIBRATION_BLEND
 * (the global tier's weight): this is a secondary, opt-in-by-evidence signal
 * on top of an already-calibrated global decision, never a replacement for
 * it — the overfit/leakage guard the pack requires.
 */
export const WORKSPACE_PRIOR_BLEND_WEIGHT = 0.15;

/**
 * Hard cap on how far a workspace prior may move a decision's confidence in
 * either direction, independent of blend weight or sample size. Prevents a
 * pathological or adversarial workspace history (e.g. a burst of identical
 * feedback) from swinging confidence outside a bounded band — the pack's
 * "prevent overfit... preference overriding hard policy" requirement applied
 * to confidence, not just to provider/model selection (which this nudge
 * never touches at all).
 */
export const MAX_WORKSPACE_PRIOR_NUDGE = 0.1;
