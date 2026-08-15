/**
 * V5 learning evolution (ADR-069) — evaluator/rubric attribution.
 *
 * A free-form identifier for whichever judge/critic/evaluator implementation
 * and rubric produced a given RoutingOutcomeRecord's judgeOutcome /
 * judgeConfidence / criticScore. Deliberately typed as `string`, not a
 * string-literal union: evaluator/rubric identities are open-ended (new
 * judge models and rubric revisions ship over time) and are not a fixed
 * domain enum. Shared so the routing-education aggregate layer and any
 * sibling evaluator-version work (e.g. replay/judge rubric versioning) can
 * agree on the shape without either depending on the other's module.
 */
export type EvaluatorVersion = string;

/** A weighted statistic paired with the freshness weight that produced it —
 * the shared shape consumed by the outlier-control statistics utility. */
export type WeightedSample = {
  value: number;
  weight: number;
};

/** A point estimate with a bounded confidence interval around it. */
export type ConfidenceInterval = {
  lowerBound: number;
  upperBound: number;
};
