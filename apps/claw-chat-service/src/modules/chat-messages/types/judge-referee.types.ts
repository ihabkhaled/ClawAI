import type { JudgeDecision } from '../../../common/enums';
import type { LlmResponse } from './execution.types';

export type CriticEvaluation = {
  feedback: string[];
  score: number;
  category: string;
  model: string;
  latencyMs: number;
};

export type JudgeResponseType =
  | 'summary'
  | 'revised_answer'
  | 'escalated_answer'
  | 'verification_note';

export type JudgeVerdict = {
  decision: JudgeDecision;
  summary: string;
  reasoning: string;
  confidence: number;
  response: string;
  responseType: JudgeResponseType;
  recommendedChanges: string[];
  model: string;
  latencyMs: number;
  wasFallback?: boolean;
  fallbackState?: 'failed' | 'unavailable';
};

export type ParsedJudgeVerdict = {
  decision: JudgeDecision;
  summary: string;
  reasoning: string;
  confidence: number;
  response: string;
  responseType: JudgeResponseType;
  recommendedChanges: string[];
  wasFallback?: boolean;
  fallbackState?: 'failed' | 'unavailable';
};

export type JudgeReviewPayload = {
  version: 1;
  judgeDecision: JudgeDecision;
  judgeModel: string;
  judgeDisplayName: string;
  judgeConfidence: number;
  judgeReasoning: string;
  judgeSummary: string;
  judgeResponse: string;
  judgeResponseType: JudgeResponseType;
  criticModel: string;
  criticDisplayName: string;
  criticFeedback: string[];
  criticScore: number;
  originalExecutionModel: string;
  originalExecutionDisplayName: string;
  originalAnswerSnapshot: string;
  revisedAnswer: string | null;
  escalatedAnswer: string | null;
  judgeLatencyMs: number;
  criticLatencyMs: number;
  judgeTotalLatencyMs: number;
  judgeMetadata: {
    category: string;
    recommendedChanges: string[];
  };
  judgeDialogAvailable: boolean;
  generatedAt: string;
};

export type JudgeRefereeResult = {
  originalResponse: LlmResponse;
  criticEvaluation: CriticEvaluation;
  judgeVerdict: JudgeVerdict;
  revisedResponse?: LlmResponse;
  escalatedResponse?: LlmResponse;
  totalLatencyMs: number;
};

export type JudgeRefereeConfig = {
  enabled: boolean;
  category: string | undefined;
  routingMode: string;
  isLocalOnly: boolean;
};

export type JudgeRefereeMetadata = {
  judgeEnabled: boolean;
  criticModel: string;
  criticFeedback: string[];
  criticScore: number;
  judgeModel: string;
  judgeDecision: string;
  judgeReasoning: string;
  judgeConfidence: number;
  revisionsCount: number;
  judgeTotalLatencyMs: number;
  judgeErrorState?: 'failed' | 'unavailable' | null;
  judgeReview: JudgeReviewPayload;
};
