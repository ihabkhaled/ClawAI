import type { CompareJudgeState, CompareResearchMode, ParallelModelStatus } from '@/enums';

import type { ChatMessage, JudgeModelOption, JudgeReview, LaneStreamMap } from './chat.types';

export type ParallelModelResponse = {
  provider: string;
  model: string;
  content: string;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  status: ParallelModelStatus;
  errorMessage: string | null;
  judgeEnabled?: boolean;
  judgeModel?: string | null;
  judgeDisplayName?: string | null;
  judgeState?: CompareJudgeState;
  judgeErrorState?: CompareJudgeState | null;
  judgeDialogAvailable?: boolean;
  judgeReview?: JudgeReview | null;
  message?: ChatMessage;
};

export type ParallelModelTarget = {
  provider: string;
  model: string;
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

export type ParallelRequest = {
  threadId?: string;
  content: string;
  models: ParallelModelTarget[];
  judgeEnabled?: boolean;
  judgeModel?: string | null;
  /** Compare-mode research enricher. Omit / NONE preserves v1 behavior. */
  researchMode?: CompareResearchMode;
  /** Optional explicit query (defaults to `content` server-side). */
  researchQuery?: string;
};

export type UseParallelComparePageReturn = {
  t: (key: string, params?: Record<string, string | number>) => string;
  selectedModels: ParallelModelTarget[];
  prompt: string;
  setPrompt: (value: string) => void;
  handleToggleModel: (provider: string, model: string, checked: boolean) => void;
  handleSend: () => void;
  result: ParallelResponse | undefined;
  isPending: boolean;
  isError: boolean;
  canSend: boolean;
  selectionError: string | null;
  pollingMessages: ChatMessage[];
  isPolling: boolean;
  allResponded: boolean;
  laneStreams: LaneStreamMap;
  handleViewInThread: () => void;
  judgeEnabled: boolean;
  setJudgeEnabled: (value: boolean) => void;
  judgeModel: string | null;
  setJudgeModel: (value: string | null) => void;
  judgeModelOptions: JudgeModelOption[];
  isJudgeModelOptionsLoading: boolean;
  researchMode: CompareResearchMode;
  setResearchMode: (value: CompareResearchMode) => void;
};

export type UseInThreadCompareParams = {
  threadId: string;
  initialJudgeEnabled?: boolean;
  initialJudgeModel?: string | null;
};

export type UseInThreadCompareReturn = {
  isOpen: boolean;
  toggleOpen: () => void;
  selectedModels: ParallelModelTarget[];
  handleToggleModel: (provider: string, model: string, checked: boolean) => void;
  handleCompare: (prompt: string) => void;
  result: ParallelResponse | undefined;
  isPending: boolean;
  isError: boolean;
  canSend: boolean;
  judgeEnabled: boolean;
  setJudgeEnabled: (value: boolean) => void;
  judgeModel: string | null;
  setJudgeModel: (value: string | null) => void;
  judgeModelOptions: JudgeModelOption[];
  isJudgeModelOptionsLoading: boolean;
  researchMode: CompareResearchMode;
  setResearchMode: (value: CompareResearchMode) => void;
};

// Declarative option for CompareResearchModeControl. `labelKey` is an i18n
// key into compare.research.* so the control body stays a pure render.
export type CompareResearchModeOption = {
  value: CompareResearchMode;
  labelKey: string;
};
