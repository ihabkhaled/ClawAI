import type { JudgeDecision } from '../../../common/enums';
import type { LlmResponse } from './execution.types';

export type CriticEvaluation = {
  feedback: string[];
  score: number;
  category: string;
  model: string;
  latencyMs: number;
};

export type JudgeVerdict = {
  decision: JudgeDecision;
  reasoning: string;
  confidence: number;
  model: string;
  latencyMs: number;
};

export type ParsedJudgeVerdict = {
  decision: JudgeDecision;
  reasoning: string;
  confidence: number;
};

export type JudgeRefereeResult = {
  criticEvaluation: CriticEvaluation;
  judgeVerdict: JudgeVerdict;
  revisedResponse?: LlmResponse;
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
};
