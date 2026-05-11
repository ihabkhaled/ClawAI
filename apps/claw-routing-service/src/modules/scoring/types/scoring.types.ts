import { type RiskLevel } from '../../../common/enums';
import {
  type CostClass,
  type DomainTag,
  type LatencyClass,
  type ModalityKind,
  type PrivacyClass,
} from '../../../generated/prisma';
import { type RouterModelRegistryRecord } from '../../router-models/types/router-model-registry.types';

export const SCORE_DIMENSIONS = [
  'capability',
  'domain',
  'role',
  'modality',
  'cost',
  'latency',
  'health',
  'privacy',
  'learnedSuccess',
  'judgeTrust',
  'contextFit',
  'uncertaintyPenalty',
  'riskPenalty',
  'fallbackReliability',
] as const;

export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number];

export type DimensionWeights = Readonly<Record<ScoreDimension, number>>;

export type ScoringClassificationInput = {
  domain: DomainTag;
  secondaryDomain: DomainTag | null;
  modalityIn: ModalityKind[];
  modalityOut: ModalityKind[];
  riskLevel: RiskLevel;
  privacyClass: PrivacyClass;
  confidence: number;
};

export type ScoringPolicy = {
  policyId: string;
  weights: DimensionWeights;
  preferLocal?: boolean;
  maxCostClass?: CostClass;
  maxLatencyClass?: LatencyClass;
};

export type ScoringHealthSignal = {
  isHealthy: boolean;
  circuitOpen: boolean;
  successRateLast24h: number | null;
};

export type ScoringCandidate = {
  profile: RouterModelRegistryRecord;
  health: ScoringHealthSignal;
  learnedSuccessRate: number | null;
  judgeTrust: number | null;
  fallbackReliability: number | null;
};

export type ScoringInput = {
  classification: ScoringClassificationInput;
  policy: ScoringPolicy;
  candidates: ScoringCandidate[];
};

export type ScoreBreakdownEntry = {
  dimension: ScoreDimension;
  rawScore: number;
  weight: number;
  weightedScore: number;
  reason: string;
};

export type ScoredCandidate = {
  profileId: string;
  totalScore: number;
  rejected: boolean;
  rejectionReason?: string;
  breakdown: ScoreBreakdownEntry[];
  winningDimensions: ScoreDimension[];
  losingDimensions: ScoreDimension[];
};

export type ScoringOutput = {
  ranked: ScoredCandidate[];
  rejected: ScoredCandidate[];
};
