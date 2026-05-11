import { Injectable, Logger } from '@nestjs/common';
import { PrivacyClass } from '../../../generated/prisma';
import {
  SCORE_DIMENSIONS,
  type ScoreBreakdownEntry,
  type ScoredCandidate,
  type ScoreDimension,
  type ScoringCandidate,
  type ScoringClassificationInput,
  type ScoringInput,
  type ScoringOutput,
  type ScoringPolicy,
} from '../types/scoring.types';
import {
  scoreCapability,
  scoreContextFit,
  scoreCost,
  scoreDomain,
  scoreFallbackReliability,
  scoreHealth,
  scoreJudgeTrust,
  scoreLatency,
  scoreLearnedSuccess,
  scoreModality,
  scorePrivacy,
  scoreRiskPenalty,
  scoreRole,
  scoreUncertaintyPenalty,
} from '../utilities/dimension-scorers.utility';
import { clamp01 } from '../utilities/normalize.utility';

@Injectable()
export class ScoringEngineManager {
  private readonly logger = new Logger(ScoringEngineManager.name);

  score(input: ScoringInput): ScoringOutput {
    this.logger.debug(
      `score candidates=${input.candidates.length} policy=${input.policy.policyId}`,
    );

    const ranked: ScoredCandidate[] = [];
    const rejected: ScoredCandidate[] = [];

    for (const candidate of input.candidates) {
      const scored = this.scoreOne(candidate, input.classification, input.policy);
      if (scored.rejected) rejected.push(scored);
      else ranked.push(scored);
    }

    ranked.sort((a, b) => b.totalScore - a.totalScore);
    rejected.sort((a, b) => b.totalScore - a.totalScore);

    return { ranked, rejected };
  }

  private scoreOne(
    candidate: ScoringCandidate,
    classification: ScoringClassificationInput,
    policy: ScoringPolicy,
  ): ScoredCandidate {
    const hardRejection = this.checkHardRejection(candidate, classification, policy);

    const breakdown: ScoreBreakdownEntry[] = SCORE_DIMENSIONS.map((dim) =>
      this.computeDimension(dim, candidate, classification, policy),
    );

    const totalScore = breakdown.reduce((acc, entry) => acc + entry.weightedScore, 0);
    const totalClamped = clamp01(totalScore);

    const sortedByWeighted = [...breakdown].sort((a, b) => b.weightedScore - a.weightedScore);
    const winningDimensions = sortedByWeighted.slice(0, 3).map((b) => b.dimension);
    const losingDimensions = sortedByWeighted.slice(-1).map((b) => b.dimension);

    return {
      profileId: candidate.profile.id,
      totalScore: Number(totalClamped.toFixed(4)),
      rejected: hardRejection !== null,
      rejectionReason: hardRejection ?? undefined,
      breakdown,
      winningDimensions,
      losingDimensions,
    };
  }

  private checkHardRejection(
    candidate: ScoringCandidate,
    classification: ScoringClassificationInput,
    _policy: ScoringPolicy,
  ): string | null {
    if (candidate.profile.isRouterOnly) return 'router_only_model';
    if (classification.privacyClass === PrivacyClass.LOCAL_ONLY && !candidate.profile.isLocal) {
      return 'privacy_class_local_only_mismatch';
    }
    if (candidate.health.circuitOpen) return 'circuit_breaker_open';
    return null;
  }

  private computeDimension(
    dim: ScoreDimension,
    candidate: ScoringCandidate,
    classification: ScoringClassificationInput,
    policy: ScoringPolicy,
  ): ScoreBreakdownEntry {
    const weight = policy.weights[dim];
    const rawScore = this.computeRaw(dim, candidate, classification);
    const weightedScore = rawScore * weight;
    return {
      dimension: dim,
      rawScore: Number(rawScore.toFixed(4)),
      weight,
      weightedScore: Number(weightedScore.toFixed(4)),
      reason: this.reasonFor(dim, rawScore),
    };
  }

  private computeRaw(
    dim: ScoreDimension,
    candidate: ScoringCandidate,
    classification: ScoringClassificationInput,
  ): number {
    switch (dim) {
      case 'capability':
        return scoreCapability(candidate);
      case 'domain':
        return scoreDomain(candidate, classification);
      case 'role':
        return scoreRole();
      case 'modality':
        return scoreModality(candidate, classification);
      case 'cost':
        return scoreCost(candidate);
      case 'latency':
        return scoreLatency(candidate);
      case 'health':
        return scoreHealth(candidate);
      case 'privacy':
        return scorePrivacy(candidate, classification);
      case 'learnedSuccess':
        return scoreLearnedSuccess(candidate);
      case 'judgeTrust':
        return scoreJudgeTrust(candidate);
      case 'contextFit':
        return scoreContextFit(candidate);
      case 'uncertaintyPenalty':
        return scoreUncertaintyPenalty(candidate);
      case 'riskPenalty':
        return scoreRiskPenalty(candidate, classification);
      case 'fallbackReliability':
        return scoreFallbackReliability(candidate);
    }
  }

  private reasonFor(dim: ScoreDimension, raw: number): string {
    if (raw >= 0.85) return `${dim}:strong`;
    if (raw >= 0.6) return `${dim}:ok`;
    if (raw >= 0.3) return `${dim}:weak`;
    return `${dim}:poor`;
  }
}
