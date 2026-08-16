import type {
  FeedbackValue,
  JudgeOutcome,
  Prisma,
  RoutingExecutionStatus,
  RoutingFeedbackRecord,
  RoutingOutcomeRecord,
} from '../../../generated/prisma';
import type { RoutingDecisionResult } from './routing.types';
import type { EvaluatorVersion, WeightedSample } from './evaluator-attribution.types';

export type RoutingDecisionWithEducation = {
  id: string;
  messageId: string | null;
  threadId: string;
  selectedProvider: string;
  selectedModel: string;
  confidence: number | null;
  routingMode: string;
  detectedCategory: string | null;
  secondaryCategory: string | null;
  reasonTags: string[];
  createdAt: Date;
  outcomes: RoutingOutcomeRecord[];
  feedbackRecords: RoutingFeedbackRecord[];
};

export type CreateRoutingOutcomeInput = {
  routingDecisionId: string;
  messageId?: string | null;
  assistantMessageId?: string | null;
  threadId: string;
  finalExecutionProvider: string;
  finalExecutionModel: string;
  executionStatus: RoutingExecutionStatus;
  executionSuccess: boolean;
  actualLatencyMs?: number | null;
  actualCostEstimate?: number | null;
  finalStatus?: string;
  fallbackUsed?: boolean;
  judgeOutcome?: JudgeOutcome;
  judgeConfidence?: number | null;
  criticScore?: number | null;
  issueTags?: string[];
  revised?: boolean;
  escalated?: boolean;
  followUpSignal?: string | null;
  // V5 learning evolution (ADR-069) — raw per-observation evaluator/rubric
  // identity. Nullable: most callers won't report one yet.
  evaluatorVersion?: EvaluatorVersion | null;
  // V6 learning evolution (ADR-070) — opaque workspace reference. Nullable:
  // no current caller reports one yet.
  workspaceId?: string | null;
};

export type CreateRoutingFeedbackInput = {
  routingDecisionId?: string | null;
  messageId: string;
  threadId: string;
  assistantMessageId?: string | null;
  feedbackValue: FeedbackValue;
  source?: string;
  weight?: number;
  taskFamily?: string | null;
};

export type RouterModelProfileRecord = {
  provider: string;
  model: string;
  taskFamily: string;
  topicKey: string;
  routeCount: number;
  successRate: number;
  thumbsUpRate: number;
  thumbsDownRate: number;
  judgeVerifiedRate: number;
  judgeRevisedRate: number;
  judgeEscalatedRate: number;
  averageLatencyMs: number;
  averageCostEstimate: number;
  fallbackSuccessRate: number;
  hallucinationRiskScore: number;
  calibrationTrustScore: number;
  weightedSuccessScore: number;
  weightedDissatisfactionScore: number;
  sampleSize: number;
  confidenceInProfile: number;
  // V5 learning evolution (ADR-069). scoreVersion/CI bounds are null only for
  // rows read back before their first post-ADR-069 rebuild; a freshly
  // computed record (bucketToProfile) always sets them.
  scoreVersion: string | null;
  successRateLowerBound: number | null;
  successRateUpperBound: number | null;
  evaluatorVersions: EvaluatorVersion[];
};

export type RouterTopicProfileRecord = {
  taskFamily: string;
  topicKey: string;
  bestProvider: string | null;
  bestModel: string | null;
  routeCount: number;
  successRate: number;
  thumbsUpRate: number;
  thumbsDownRate: number;
  judgeVerifiedRate: number;
  judgeEscalatedRate: number;
  fallbackSuccessRate: number;
  weightedSuccessScore: number;
  ambiguityScore: number;
  confidenceInProfile: number;
  // V5 learning evolution (ADR-069) — see RouterModelProfileRecord.
  scoreVersion: string | null;
  successRateLowerBound: number | null;
  successRateUpperBound: number | null;
  evaluatorVersions: EvaluatorVersion[];
};

export type RoutingCalibrationSummary = {
  windowDays: number;
  decisionsAnalyzed: number;
  feedbackEvents: number;
  outcomesAnalyzed: number;
  topTaskFamilies: Array<{
    taskFamily: string;
    weightedSuccessScore: number;
    bestProvider: string | null;
    bestModel: string | null;
    confidenceInProfile: number;
  }>;
  cautionModels: Array<{
    provider: string;
    model: string;
    taskFamily: string;
    weightedDissatisfactionScore: number;
    sampleSize: number;
  }>;
};

export type RoutingPromptHintSnapshot = {
  bestModelsByTaskFamily: Array<{
    taskFamily: string;
    provider: string;
    model: string;
    weightedSuccessScore: number;
    confidenceInProfile: number;
  }>;
  cautionModels: Array<{
    provider: string;
    model: string;
    taskFamily: string;
    weightedDissatisfactionScore: number;
  }>;
  ambiguousTaskFamilies: Array<{
    taskFamily: string;
    ambiguityScore: number;
    recommendation: string;
  }>;
};

export type RoutingEducationSnapshot = {
  version: string;
  summary: RoutingCalibrationSummary;
  promptHints: RoutingPromptHintSnapshot;
};

export type RouterFeedbackPolarity = 'positive' | 'negative';

export type RoutingFeedbackEventPayload = {
  messageId: string;
  threadId: string;
  feedback: RouterFeedbackPolarity | null;
  routingMessageId?: string;
  provider?: string;
  model?: string;
  detectedCategory?: string;
};

export type RoutingCompletedEventPayload = {
  messageId: string;
  threadId: string;
  assistantMessageId?: string;
  provider: string;
  model: string;
  latencyMs?: number;
  executionSuccess?: boolean;
  finalStatus?: string;
  errorMessage?: string;
  usedFallback?: boolean;
  judgeDecision?: string;
  judgeConfidence?: number;
  criticScore?: number;
  reRouted?: boolean;
  detectedCategory?: string;
  // V5 learning evolution (ADR-069) — which evaluator/rubric produced
  // judgeDecision/judgeConfidence/criticScore, if the caller reports one.
  evaluatorVersion?: EvaluatorVersion;
  // V6 learning evolution (ADR-070) — opaque workspace reference. No current
  // caller populates it; when present, ingestExecutionOutcome also rolls
  // this outcome into a RouterWorkspacePrior row for that workspace.
  workspaceId?: string;
};

export type LearnedDecisionCalibration = {
  decision: RoutingDecisionResult;
  changed: boolean;
};

export type AggregateBucket = {
  provider: string;
  model: string;
  taskFamily: string;
  topicKey: string;
  routeCount: number;
  totalWeight: number;
  weightedSuccess: number;
  weightedDissatisfaction: number;
  thumbsUpWeight: number;
  thumbsDownWeight: number;
  judgeVerifiedWeight: number;
  judgeRevisedWeight: number;
  judgeEscalatedWeight: number;
  // V5 learning evolution (ADR-069) — outlier control. Raw freshness-weighted
  // samples, not a running sum, so bucketToProfile can winsorize before
  // averaging instead of letting one anomalous value dominate a plain sum.
  latencySamples: WeightedSample[];
  costSamples: WeightedSample[];
  fallbackSuccessWeight: number;
  fallbackWeight: number;
  hallucinationWeight: number;
  // V5 learning evolution (ADR-069) — evaluator attribution rollup.
  evaluatorVersions: Set<EvaluatorVersion>;
};

/**
 * V5 learning evolution (ADR-069) — batch recalibration first, rollback.
 * The full computed batch persisted as one versioned, immutable unit before
 * it is promoted to the live RouterModelProfile / RouterTopicProfile tables.
 */
export type CommitCalibrationBatchInput = {
  version: string;
  windowDays: number;
  summary: Prisma.InputJsonValue;
  promptHints: Prisma.InputJsonValue;
  modelProfiles: Prisma.InputJsonValue;
  topicProfiles: Prisma.InputJsonValue;
  modelProfileRows: RouterModelProfileRecord[];
  topicProfileRows: RouterTopicProfileRecord[];
};

export type RollbackCalibrationReason = 'SNAPSHOT_NOT_FOUND' | 'NO_ARCHIVED_PROFILES';

export type RollbackCalibrationResult = {
  rolledBack: boolean;
  restoredVersion: string | null;
  reason: RollbackCalibrationReason | null;
};
