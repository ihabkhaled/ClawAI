import type {
  FeedbackValue,
  JudgeOutcome,
  RoutingExecutionStatus,
  RoutingFeedbackRecord,
  RoutingOutcomeRecord,
} from '../../../generated/prisma';
import type { RoutingDecisionResult } from './routing.types';

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
  latencyWeightedSum: number;
  costWeightedSum: number;
  latencyWeight: number;
  costWeight: number;
  fallbackSuccessWeight: number;
  fallbackWeight: number;
  hallucinationWeight: number;
};
