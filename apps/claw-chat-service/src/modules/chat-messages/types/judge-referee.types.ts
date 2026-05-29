import type { TokenUsageSource } from '@claw/shared-types';
import type { JudgeDecision } from '../../../common/enums';
import type { LlmResponse } from './execution.types';

// Feature 1/2 — aggregated token usage consumed by the judge + critic calls
// (cloud or local), tagged so it can be recorded with TokenLedgerContext.JUDGE.
export type JudgeTokenUsage = {
  inputTokens: number;
  outputTokens: number;
  estimated: boolean;
  source: TokenUsageSource;
};

export type CriticEvaluation = {
  feedback: string[];
  score: number;
  category: string;
  model: string;
  latencyMs: number;
  // Feature 2 — token usage from the critic call (cloud or local).
  inputTokens?: number;
  outputTokens?: number;
  tokenEstimated?: boolean;
  tokenSource?: TokenUsageSource;
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
  // Feature 2 — token usage from the judge call (cloud or local).
  inputTokens?: number;
  outputTokens?: number;
  tokenEstimated?: boolean;
  tokenSource?: TokenUsageSource;
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
  // Feature 1/2 — combined critic + judge token usage so the chat service can
  // record it to the usage ledger with TokenLedgerContext.JUDGE.
  tokenUsage?: JudgeTokenUsage;
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
  // Feature 2 — token usage transparency for the judge/critic pipeline.
  judgeInputTokens?: number;
  judgeOutputTokens?: number;
  judgeTokenEstimated?: boolean;
  judgeTokenSource?: TokenUsageSource;
};
