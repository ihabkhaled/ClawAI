import type {
  AdvancedModuleModelSelection,
  AdvancedModelSelectionPayload,
} from './advanced-model-selection.types';
import type { ModelSelection } from './component.types';
import type { TranslateFunction } from './i18n.types';
import type { OrchestrationStage } from './orchestration.types';

export type CandidateResult = {
  content: string;
  provider: string;
  model: string;
  latencyMs: number;
  qualityScore: number;
  qualityReasons: string[];
  rank: number;
};

export type BestOfNMetadata = {
  bestOfN: true;
  candidates: CandidateResult[];
  bestRank: number;
};

export type BestOfNResultState = {
  content: string;
  metadata: BestOfNMetadata;
};

export type BestOfNRequest = AdvancedModelSelectionPayload & {
  content: string;
  threadId?: string;
  n: number;
  models?: string[];
};

export type BestOfNResponse = {
  messageId: string;
  threadId: string;
};

export type UseBestOfNSendResult = {
  send: (data: BestOfNRequest) => void;
  result: BestOfNResponse | undefined;
  isPending: boolean;
  isError: boolean;
};

export type UseBestOfNPollResult = {
  bestOfNResult: BestOfNResultState | null;
  isPolling: boolean;
  isBestOfNReady: boolean;
  isBestOfNError: boolean;
  handleViewInThread: () => void;
};

export type UseBestOfNPageReturn = {
  t: TranslateFunction;
  content: string;
  setContent: (v: string) => void;
  n: number;
  setN: (n: number) => void;
  selectedModel: AdvancedModuleModelSelection;
  setSelectedModel: (value: ModelSelection | null) => void;
  handleSend: () => void;
  canSend: boolean;
  // True iff the user has typed something AND picked a model. The
  // orchestration shell drives the submit button off this flag; the
  // legacy `canSend` is kept for backwards compatibility with callers
  // that also factor in the pending/polling state.
  canSubmit: boolean;
  isPending: boolean;
  isError: boolean;
  // Live orchestration stages projected from the chat-service SSE
  // channel. Empty until the first submission arrives; reset on
  // re-submission.
  stages: OrchestrationStage[];
  hasProgress: boolean;
  // Resolved user-facing error string (mutation error OR SSE error OR
  // poll-detected backend error). `null` when no error condition is
  // active. The shell renders this in an Alert variant=Error.
  errorMessage: string | null;
  bestOfNResult: BestOfNResultState | null;
  isPolling: boolean;
  isBestOfNReady: boolean;
  isBestOfNError: boolean;
  handleViewInThread: () => void;
};
