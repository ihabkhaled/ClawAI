import type { CostTier } from '@/enums';

import type {
  AdvancedModuleModelSelection,
  AdvancedModelSelectionPayload,
} from './advanced-model-selection.types';
import type { TranslateFunction } from './i18n.types';
import type { OrchestrationStage } from './orchestration.types';

export type CostClassification = {
  tier: CostTier;
  complexity: number;
  risk: number;
  ambiguity: number;
  reasoning: string;
};

export type EnsembleCandidate = {
  model: string;
  response: string;
  latencyMs: number;
};

export type CostEnsembleMetadata = {
  costEnsemble: boolean;
  tier: CostTier;
  classification: CostClassification;
  candidates: EnsembleCandidate[];
  selectedIndex: number;
};

export type CostEnsembleResult = {
  content: string;
  metadata: CostEnsembleMetadata;
};

export type SendCostEnsemblePayload = AdvancedModelSelectionPayload & {
  content: string;
};

export type SendCostEnsembleResult = {
  messageId: string;
  threadId: string;
};

export type UseSendCostEnsembleResult = {
  send: (data: SendCostEnsemblePayload) => void;
  result: SendCostEnsembleResult | undefined;
  isPending: boolean;
  isError: boolean;
};

export type UseCostEnsemblePollResult = {
  costEnsembleResult: CostEnsembleResult | null;
  isPolling: boolean;
  isCostEnsembleReady: boolean;
  isCostEnsembleError: boolean;
  handleViewInThread: () => void;
};

export type UseCostEnsemblePageReturn = {
  t: TranslateFunction;
  content: string;
  setContent: (v: string) => void;
  selectedModel: AdvancedModuleModelSelection;
  setSelectedModel: (value: AdvancedModuleModelSelection) => void;
  handleSend: () => void;
  canSend: boolean;
  // `canSubmit` is the shell-friendly gate: `content.trim().length > 0`
  // AND `selectedModel !== null`. It does NOT factor in run state — the
  // shell disables the button on its own while `isPending` is true.
  canSubmit: boolean;
  isPending: boolean;
  isError: boolean;
  costEnsembleResult: CostEnsembleResult | null;
  isPolling: boolean;
  isCostEnsembleReady: boolean;
  isCostEnsembleError: boolean;
  handleViewInThread: () => void;
  // Live orchestration sub-stage timeline projected from the chat-service
  // SSE channel. Mapped from `orchestration_stage` events the cost-ensemble
  // manager emits during classification / candidate runs / synthesis.
  stages: OrchestrationStage[];
  // True iff at least one orchestration stage has arrived. Lets the shell
  // swap the loading skeleton for the live progress timeline.
  hasProgress: boolean;
  // True while either the mutation is in-flight OR a result is still being
  // polled / streamed. The shell wires this into its skeleton + button gate.
  isRunning: boolean;
};
