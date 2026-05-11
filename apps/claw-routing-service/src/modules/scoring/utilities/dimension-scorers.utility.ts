import { RiskLevel } from '../../../common/enums';
import {
  CostConfidence,
  type ModalityKind,
  PrivacyClass,
  QualityTier,
} from '../../../generated/prisma';
import {
  COST_CLASS_SCORE,
  LATENCY_CLASS_SCORE,
  QUALITY_TIER_SCORE,
} from '../constants/scoring.constants';
import { type ScoringCandidate, type ScoringClassificationInput } from '../types/scoring.types';
import { clamp01 } from './normalize.utility';

/// Capability dimension: how well the model's quality tier matches the task.
export function scoreCapability(candidate: ScoringCandidate): number {
  const tier = candidate.profile.qualityTier;
  return QUALITY_TIER_SCORE[tier] ?? 0.5;
}

/// Domain dimension: does the model's domainTags include the classification's
/// primary or secondary domain? Heavy not-recommended-for penalty.
export function scoreDomain(
  candidate: ScoringCandidate,
  classification: ScoringClassificationInput,
): number {
  const tags = candidate.profile.domainTags;
  const notFor = candidate.profile.notRecommendedFor;
  if (notFor.includes(classification.domain)) return 0;
  if (tags.includes(classification.domain)) return 1;
  if (classification.secondaryDomain !== null && tags.includes(classification.secondaryDomain)) {
    return 0.6;
  }
  if (tags.length === 0) return 0.5;
  return 0.3;
}

/// Role dimension: phase-2 classifier emits roleKey=null today; placeholder
/// returns a neutral 0.5 score until phase 10 wires role inference.
export function scoreRole(): number {
  return 0.5;
}

/// Modality dimension: model must cover every required input modality.
/// Missing modality → 0. Full match → 1. Partial → ratio.
export function scoreModality(
  candidate: ScoringCandidate,
  classification: ScoringClassificationInput,
): number {
  const requiredIn = classification.modalityIn;
  const requiredOut = classification.modalityOut;
  const supportedIn = new Set<ModalityKind>(candidate.profile.modalitiesIn);
  const supportedOut = new Set<ModalityKind>(candidate.profile.modalitiesOut);

  if (requiredIn.length === 0 && requiredOut.length === 0) return 0.5;

  let matchedIn = 0;
  for (const m of requiredIn) if (supportedIn.has(m)) matchedIn += 1;
  let matchedOut = 0;
  for (const m of requiredOut) if (supportedOut.has(m)) matchedOut += 1;

  const totalRequired = requiredIn.length + requiredOut.length;
  const totalMatched = matchedIn + matchedOut;
  return clamp01(totalMatched / totalRequired);
}

/// Cost dimension: lower cost = higher score.
export function scoreCost(candidate: ScoringCandidate): number {
  const { costClass } = candidate.profile;
  if (costClass === null) return 0.5;
  return COST_CLASS_SCORE[costClass] ?? 0.5;
}

/// Latency dimension: faster = higher score.
export function scoreLatency(candidate: ScoringCandidate): number {
  const { latencyClass } = candidate.profile;
  if (latencyClass === null) return 0.5;
  return LATENCY_CLASS_SCORE[latencyClass] ?? 0.5;
}

/// Health dimension: composite of health + circuit + 24h success rate.
export function scoreHealth(candidate: ScoringCandidate): number {
  if (candidate.health.circuitOpen) return 0;
  if (!candidate.health.isHealthy) return 0.2;
  const successRate = candidate.health.successRateLast24h;
  if (successRate === null) return 0.7;
  return clamp01(0.5 + 0.5 * successRate);
}

/// Privacy dimension: does the model's privacy support meet/exceed the
/// classification's privacy requirement?
export function scorePrivacy(
  candidate: ScoringCandidate,
  classification: ScoringClassificationInput,
): number {
  const required = classification.privacyClass;
  const support = candidate.profile.privacySupport;

  if (required === PrivacyClass.LOCAL_ONLY) {
    return support === PrivacyClass.LOCAL_ONLY || candidate.profile.isLocal ? 1 : 0;
  }
  if (required === PrivacyClass.LOCAL_PREFERRED) {
    if (candidate.profile.isLocal) return 1;
    if (support === PrivacyClass.LOCAL_PREFERRED) return 0.9;
    return 0.5;
  }
  if (required === PrivacyClass.CLOUD_PERMITTED) return 1;
  return 1;
}

/// Learned-success dimension: from Phase 10 LearnedScore (null today, defaults).
export function scoreLearnedSuccess(candidate: ScoringCandidate): number {
  if (candidate.learnedSuccessRate === null) return 0.6;
  return clamp01(candidate.learnedSuccessRate);
}

/// Judge-trust dimension: 1 if marked judgeSuitable, else 0.5 baseline.
export function scoreJudgeTrust(candidate: ScoringCandidate): number {
  if (candidate.judgeTrust !== null) return clamp01(candidate.judgeTrust);
  return candidate.profile.judgeSuitability ? 0.85 : 0.5;
}

/// Context-fit dimension: penalize if model's context window is too small for
/// the task — proxy here is just the absolute window size (bigger = better).
export function scoreContextFit(candidate: ScoringCandidate): number {
  const window = candidate.profile.contextWindowTokens;
  if (window === null) return 0.5;
  if (window >= 200_000) return 1;
  if (window >= 32_000) return 0.85;
  if (window >= 8000) return 0.6;
  if (window >= 4000) return 0.4;
  return 0.2;
}

/// Uncertainty penalty: caps score if cost / latency / quality is UNKNOWN.
/// Returned as a *penalty score* (1=no penalty, lower=more penalty applied).
export function scoreUncertaintyPenalty(candidate: ScoringCandidate): number {
  const unknownCost = candidate.profile.costConfidence === CostConfidence.UNKNOWN;
  const unknownLatency = candidate.profile.latencyClass === null;
  const unknownQuality = candidate.profile.qualityTier === QualityTier.D;
  if (unknownCost || unknownLatency || unknownQuality) return 0.5;
  return 1;
}

/// Risk penalty: HIGH/CRITICAL risk with quality C/D drops the candidate.
export function scoreRiskPenalty(
  candidate: ScoringCandidate,
  classification: ScoringClassificationInput,
): number {
  const isWeak =
    candidate.profile.qualityTier === QualityTier.C ||
    candidate.profile.qualityTier === QualityTier.D;
  const isHighRisk =
    classification.riskLevel === RiskLevel.HIGH || classification.riskLevel === RiskLevel.CRITICAL;
  if (isWeak && isHighRisk) return 0.4;
  return 1;
}

/// Fallback-reliability: did this model rescue calls when chosen as fallback?
export function scoreFallbackReliability(candidate: ScoringCandidate): number {
  if (candidate.fallbackReliability !== null) return clamp01(candidate.fallbackReliability);
  return candidate.profile.fallbackSuitability ? 0.7 : 0.4;
}
