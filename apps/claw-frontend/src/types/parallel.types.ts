import type { CompareJudgeState, ParallelModelStatus, PlanFeature, ResearchMode } from '@/enums';

import type { ChatMessage, JudgeModelOption, JudgeReview, LaneStreamMap } from './chat.types';
import type { CompareJudgeVerdict } from './compare-judge.types';
import type { FileDeliveryEntry } from './file-delivery.types';
import type { ResearchOptions, SanitizedResearchProvider } from './research.types';

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
  /** Position of this lane in its run — the key the comparative verdict refers to. */
  compareLaneIndex?: number | null;
  /** ADR-116 — the run's one comparative judge verdict; identical on every lane. */
  compareJudge?: CompareJudgeVerdict | null;
  message?: ChatMessage;
  // Per-file delivery record for THIS lane. Populated by chat-service from
  // ASSISTANT message `metadata.fileDelivery`. Lane 5 renders delivery
  // indicators off these entries.
  attachmentDelivery?: FileDeliveryEntry[];
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
  // Critic toggle + model. UI keeps `criticEnabled` gated behind judgeEnabled;
  // backend's parallel DTO refines that `criticEnabled === true` requires both
  // `judgeEnabled === true` AND a non-empty `criticModel`. Backend also gates
  // on the `allowCriticReview` plan feature.
  criticEnabled?: boolean;
  criticModel?: string | null;
  /** Compare-mode research enricher. Omit / NONE preserves v1 behavior. */
  researchMode?: ResearchMode;
  /**
   * Explicit research provider. Optional: absent means "let the backend pick",
   * which is what every Compare run did before the provider dropdown existed.
   */
  researchProviderId?: string;
  /** Optional explicit query (defaults to `content` server-side). */
  researchQuery?: string;
  /**
   * Optional file IDs to attach to this compare run. Each lane (provider+model)
   * receives a per-lane prompt assembled by chat-service: text files are
   * extracted+injected, images are wired natively when the model has vision,
   * otherwise omitted. Per-file delivery results come back on each
   * `ParallelModelResponse.attachmentDelivery`.
   */
  fileIds?: string[];
};

export type UseParallelCompareReturn = {
  send: (data: ParallelRequest) => void;
  result: ParallelResponse | undefined;
  isPending: boolean;
  isError: boolean;
  // Locked plan feature surfaced from the latest send attempt. When non-null,
  // the page renders an upgrade CTA banner instead of a generic toast.
  upgradeFeature: PlanFeature | null;
  clearUpgradeFeature: () => void;
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
  criticEnabled: boolean;
  setCriticEnabled: (value: boolean) => void;
  criticModel: string | null;
  setCriticModel: (value: string | null) => void;
  // Research mode + provider, the same shape the chat composer and the nine
  // orchestration labs use. Defaults to AUTO, not NONE.
  research: ResearchOptions;
  setResearch: (value: ResearchOptions) => void;
  researchProviders: SanitizedResearchProvider[];
  isResearchProvidersLoading: boolean;
  // File attachments selected for the compare run. Threaded into the
  // parallel send payload as `fileIds` and reset on successful send.
  selectedFileIds: string[];
  setSelectedFileIds: (ids: string[]) => void;
  // Paste/drop ingestion: uploads files and appends their ids to selectedFileIds.
  ingestFiles: (files: FileList | File[]) => void;
  // Set to the locked PlanFeature when the latest send was rejected with a
  // PLAN_FEATURE_DISABLED 403 from the backend (judge/critic/research). The
  // page renders an UpgradeCtaBanner above the results when non-null;
  // clearUpgradeFeature dismisses the banner.
  upgradeFeature: PlanFeature | null;
  clearUpgradeFeature: () => void;
};

export type UseInThreadCompareParams = {
  threadId: string;
  initialJudgeEnabled?: boolean;
  initialJudgeModel?: string | null;
  // Externally-controlled panel visibility. Drives the file-selection reset
  // (a stale selection must not survive into the next open) — the hook owns
  // no open/close state itself; the page-level panel coordinator does.
  isOpen?: boolean;
  // Called after a compare run is accepted, so the coordinator can close the
  // panel and reveal the thread streaming the parallel responses.
  onSendSuccess?: () => void;
};

export type UseInThreadCompareReturn = {
  selectedModels: ParallelModelTarget[];
  handleToggleModel: (provider: string, model: string, checked: boolean) => void;
  // Controlled prompt state for the in-thread compare textarea. RichPromptTextarea
  // binds to prompt/setPrompt; Enter (no Shift, not composing) fires handleSend
  // which clears `prompt` and forwards to handleCompare.
  prompt: string;
  setPrompt: (value: string) => void;
  handleSend: () => void;
  // Lower-level imperative entry point. Callers may bypass the controlled
  // textarea and fire a compare with an explicit prompt (e.g. unit tests).
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
  criticEnabled: boolean;
  setCriticEnabled: (value: boolean) => void;
  criticModel: string | null;
  setCriticModel: (value: string | null) => void;
  // Research mode + provider, the same shape the chat composer and the nine
  // orchestration labs use. Defaults to AUTO, not NONE.
  research: ResearchOptions;
  setResearch: (value: ResearchOptions) => void;
  researchProviders: SanitizedResearchProvider[];
  isResearchProvidersLoading: boolean;
  // File attachments selected for the in-thread compare run. Threaded into
  // the parallel send payload as `fileIds` and reset on successful send /
  // panel close.
  selectedFileIds: string[];
  setSelectedFileIds: (ids: string[]) => void;
  // Paste/drop ingestion: uploads files and appends their ids to selectedFileIds.
  ingestFiles: (files: FileList | File[]) => void;
};
