import type { ConnectorProvider } from '../enums/connector-provider.enum';
import type { JudgeCriterionKey } from '../enums/judge-criterion-key.enum';
import type { JudgeExecutionMode } from '../enums/judge-execution-mode.enum';
import type { TokenUsage } from './token-usage.type';

export type JudgeCriterion = {
  key: JudgeCriterionKey;
  label?: string;
  weight?: number;
};

export type JudgeScore = {
  key: JudgeCriterionKey;
  score: number;
  rationale?: string;
};

export type JudgeRequest = {
  judgeProvider: ConnectorProvider;
  judgeModel: string;
  criteria?: JudgeCriterion[];
  mode?: JudgeExecutionMode;
};

export type JudgeEvaluationResult = {
  id: string;
  targetMessageId?: string;
  compareRunId?: string;
  judgeProvider: ConnectorProvider;
  judgeModel: string;
  targetProvider?: string;
  targetModel?: string;
  scores: JudgeScore[];
  totalScore: number;
  reasoning: string;
  tokenUsage: TokenUsage;
  createdAt: string;
};
