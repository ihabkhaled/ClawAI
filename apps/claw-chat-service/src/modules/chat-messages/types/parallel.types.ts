import type { TokenLedgerContext, TokenUsageSource } from '@claw/shared-types';
import type { CompareJudgeState } from '../../../common/enums';
import type { JudgeReviewPayload } from './judge-referee.types';

export type ParallelModelTarget = {
  provider: string;
  model: string;
};

export type ParallelModelResponse = {
  provider: string;
  model: string;
  content: string;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  // Feature 2 — per-model token usage transparency for compare runs.
  tokenEstimated?: boolean;
  tokenSource?: TokenUsageSource;
  tokenContext?: TokenLedgerContext;
  status: 'completed' | 'failed' | 'timeout';
  errorMessage: string | null;
  judgeEnabled?: boolean;
  judgeModel?: string | null;
  judgeDisplayName?: string | null;
  judgeState?: CompareJudgeState;
  judgeErrorState?: CompareJudgeState | null;
  judgeDialogAvailable?: boolean;
  judgeReview?: JudgeReviewPayload | null;
  // Feature 1/2 — judge/critic combined token usage for this compare response.
  judgeInputTokens?: number;
  judgeOutputTokens?: number;
  judgeTokenEstimated?: boolean;
  judgeTokenSource?: TokenUsageSource;
};

export type ParallelJudgeConfig = {
  enabled: boolean;
  model: string | null;
};

export type ParallelResponse = {
  messageId: string;
  threadId: string;
  prompt: string;
  responses: ParallelModelResponse[];
  totalLatencyMs: number;
  completedCount: number;
  failedCount: number;
  judgeEnabled: boolean;
  judgeModel: string | null;
};
