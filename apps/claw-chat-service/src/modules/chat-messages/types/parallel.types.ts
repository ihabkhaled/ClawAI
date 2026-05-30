import type { TokenLedgerContext, TokenUsageSource } from '@claw/shared-types';
import type { CompareJudgeState, ResearchMode } from '../../../common/enums';
import type { FileDeliveryEntry } from './file-delivery.types';
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
  // Slice A — per-lane file-delivery telemetry. One entry per attached file
  // describing whether it reached this provider+model as extracted text,
  // native image, or was omitted. Mirrored verbatim into the assistant
  // message metadata.fileDelivery JSON for the FE + judge/critic.
  attachmentDelivery?: FileDeliveryEntry[];
};

export type ParallelJudgeConfig = {
  enabled: boolean;
  model: string | null;
};

// User-selected critic configuration threaded into the JudgeRefereeManager.
// `enabled` requires judgeEnabled to also be true (enforced in the DTO refine).
// `model` is the encoded selection from the FE — either a plain local model
// name or a `PROVIDER:model` cloud-judge string parsed by parseJudgeModel.
export type ParallelCriticConfig = {
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

// Compare-mode research enricher options surfaced from the DTO down to the
// ParallelExecutionManager so it can call ResearchEnricherManager BEFORE
// assembling the shared context for the parallel lanes.
export type ParallelResearchOptions = {
  mode?: ResearchMode;
  query?: string;
  /** Raw bearer token (without the "Bearer " prefix). May be empty. */
  userToken: string;
};
