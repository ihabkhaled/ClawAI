import { CostClass, LatencyClass, QualityTier, RoutingMode } from '../../../generated/prisma';
import { type DimensionWeights } from '../types/scoring.types';

/// Per-routing-mode default weights. Each row sums to 1.0 (within 0.001).
/// Policies can override these via `RoutingPolicy.config.weightsJson` (Phase 4).
export const DEFAULT_POLICY_WEIGHTS: Readonly<Record<RoutingMode, DimensionWeights>> =
  Object.freeze({
    [RoutingMode.AUTO]: Object.freeze({
      capability: 0.18,
      domain: 0.15,
      role: 0.05,
      modality: 0.1,
      cost: 0.12,
      latency: 0.08,
      health: 0.07,
      privacy: 0.08,
      learnedSuccess: 0.06,
      judgeTrust: 0.03,
      contextFit: 0.03,
      uncertaintyPenalty: 0.02,
      riskPenalty: 0.02,
      fallbackReliability: 0.01,
    }),
    [RoutingMode.COST_SAVER]: Object.freeze({
      capability: 0.12,
      domain: 0.1,
      role: 0.04,
      modality: 0.08,
      cost: 0.28,
      latency: 0.06,
      health: 0.07,
      privacy: 0.06,
      learnedSuccess: 0.07,
      judgeTrust: 0.03,
      contextFit: 0.03,
      uncertaintyPenalty: 0.02,
      riskPenalty: 0.02,
      fallbackReliability: 0.02,
    }),
    [RoutingMode.LOW_LATENCY]: Object.freeze({
      capability: 0.12,
      domain: 0.08,
      role: 0.04,
      modality: 0.08,
      cost: 0.06,
      latency: 0.28,
      health: 0.09,
      privacy: 0.06,
      learnedSuccess: 0.07,
      judgeTrust: 0.02,
      contextFit: 0.04,
      uncertaintyPenalty: 0.02,
      riskPenalty: 0.02,
      fallbackReliability: 0.02,
    }),
    [RoutingMode.HIGH_REASONING]: Object.freeze({
      capability: 0.22,
      domain: 0.14,
      role: 0.06,
      modality: 0.08,
      cost: 0.04,
      latency: 0.04,
      health: 0.06,
      privacy: 0.06,
      learnedSuccess: 0.1,
      judgeTrust: 0.08,
      contextFit: 0.06,
      uncertaintyPenalty: 0.02,
      riskPenalty: 0.02,
      fallbackReliability: 0.02,
    }),
    [RoutingMode.PRIVACY_FIRST]: Object.freeze({
      capability: 0.13,
      domain: 0.11,
      role: 0.04,
      modality: 0.08,
      cost: 0.05,
      latency: 0.05,
      health: 0.07,
      privacy: 0.28,
      learnedSuccess: 0.06,
      judgeTrust: 0.03,
      contextFit: 0.03,
      uncertaintyPenalty: 0.03,
      riskPenalty: 0.02,
      fallbackReliability: 0.02,
    }),
    [RoutingMode.LOCAL_ONLY]: Object.freeze({
      capability: 0.18,
      domain: 0.13,
      role: 0.05,
      modality: 0.1,
      cost: 0.04,
      latency: 0.06,
      health: 0.09,
      privacy: 0.18,
      learnedSuccess: 0.06,
      judgeTrust: 0.02,
      contextFit: 0.03,
      uncertaintyPenalty: 0.02,
      riskPenalty: 0.02,
      fallbackReliability: 0.02,
    }),
    [RoutingMode.MANUAL_MODEL]: Object.freeze({
      capability: 0.5,
      domain: 0.0,
      role: 0.0,
      modality: 0.2,
      cost: 0.0,
      latency: 0.0,
      health: 0.2,
      privacy: 0.05,
      learnedSuccess: 0.0,
      judgeTrust: 0.0,
      contextFit: 0.05,
      uncertaintyPenalty: 0.0,
      riskPenalty: 0.0,
      fallbackReliability: 0.0,
    }),
  });

export const COST_CLASS_PRICE_THRESHOLDS: ReadonlyArray<{ max: number; class: CostClass }> =
  Object.freeze([
    { max: 0, class: CostClass.FREE },
    { max: 0.5, class: CostClass.CHEAP },
    { max: 5, class: CostClass.STANDARD },
    { max: 30, class: CostClass.PREMIUM },
    { max: Number.POSITIVE_INFINITY, class: CostClass.ULTRA },
  ]);

export const LATENCY_CLASS_P95_THRESHOLDS_MS: ReadonlyArray<{
  max: number;
  class: LatencyClass;
}> = Object.freeze([
  { max: 300, class: LatencyClass.REALTIME },
  { max: 1000, class: LatencyClass.FAST },
  { max: 3000, class: LatencyClass.MEDIUM },
  { max: 10_000, class: LatencyClass.SLOW },
  { max: Number.POSITIVE_INFINITY, class: LatencyClass.HEAVY },
]);

export const COST_CLASS_SCORE: Readonly<Record<CostClass, number>> = Object.freeze({
  [CostClass.FREE]: 1.0,
  [CostClass.CHEAP]: 0.85,
  [CostClass.STANDARD]: 0.65,
  [CostClass.PREMIUM]: 0.4,
  [CostClass.ULTRA]: 0.15,
});

export const LATENCY_CLASS_SCORE: Readonly<Record<LatencyClass, number>> = Object.freeze({
  [LatencyClass.REALTIME]: 1.0,
  [LatencyClass.FAST]: 0.85,
  [LatencyClass.MEDIUM]: 0.65,
  [LatencyClass.SLOW]: 0.4,
  [LatencyClass.HEAVY]: 0.15,
});

export const QUALITY_TIER_SCORE: Readonly<Record<QualityTier, number>> = Object.freeze({
  [QualityTier.S]: 1.0,
  [QualityTier.A]: 0.85,
  [QualityTier.B]: 0.65,
  [QualityTier.C]: 0.4,
  [QualityTier.D]: 0.2,
});

/// Score multiplied by this when any of cost/latency/quality is UNKNOWN.
export const UNCERTAINTY_PENALTY = 0.5;

/// Score reduced by this when HIGH/CRITICAL risk meets a quality-C/D model.
export const RISK_QUALITY_PENALTY = 0.3;

/// Numerical tolerance for dimension-weight sum validation.
export const WEIGHTS_SUM_TOLERANCE = 0.001;
