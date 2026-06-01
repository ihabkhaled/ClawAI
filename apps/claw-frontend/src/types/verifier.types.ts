import type {
  AdvancedModuleModelSelection,
  AdvancedModelSelectionPayload,
} from './advanced-model-selection.types';
import type { TranslateFunction } from './i18n.types';
import type { OrchestrationStage } from './orchestration.types';

export type VerifyMetadata = {
  verified: boolean;
  verifierScore: number;
  verifierIssues: string[];
  revisionCount: number;
};

export type VerifyResult = {
  content: string;
  metadata: VerifyMetadata;
};

export type SendVerifyPayload = AdvancedModelSelectionPayload & {
  content: string;
  maxRevisions?: number;
};

export type SendVerifyResult = {
  messageId: string;
  threadId: string;
};

export type UseVerifyResultState = {
  content: string;
  metadata: VerifyMetadata;
};

export type UseSendVerifyResult = {
  send: (payload: SendVerifyPayload) => void;
  result: SendVerifyResult | undefined;
  isPending: boolean;
  isError: boolean;
};

export type UseVerifyPollResult = {
  verifyResult: UseVerifyResultState | null;
  isPolling: boolean;
  isVerifyReady: boolean;
  isVerifyError: boolean;
  handleViewInThread: () => void;
};

export type UseVerifyPageReturn = {
  t: TranslateFunction;
  content: string;
  setContent: (value: string) => void;
  maxRevisions: number;
  setMaxRevisions: (value: number) => void;
  selectedModel: AdvancedModuleModelSelection;
  setSelectedModel: (value: AdvancedModuleModelSelection) => void;
  handleSend: () => void;
  canSend: boolean;
  // `canSubmit` is the shell-friendly gate: `content.trim().length >=
  // VERIFIER_CONTENT_MIN_LENGTH` AND `selectedModel !== null`. It does NOT
  // factor in run state — the shell disables the button on its own while
  // `isPending` is true.
  canSubmit: boolean;
  isPending: boolean;
  isError: boolean;
  verifyResult: UseVerifyResultState | null;
  isPolling: boolean;
  isVerifyReady: boolean;
  isVerifyError: boolean;
  handleViewInThread: () => void;
  // Live orchestration sub-stage timeline projected from the chat-service
  // SSE channel. Mapped from `orchestration_stage` events the verifier
  // manager emits during generate → verify → revise loops.
  stages: OrchestrationStage[];
  // True iff at least one orchestration stage has arrived. Lets the shell
  // swap the loading skeleton for the live progress timeline.
  hasProgress: boolean;
  // True while either the mutation is in-flight OR a result is still being
  // polled / streamed. The shell wires this into its skeleton + button gate.
  isRunning: boolean;
};
