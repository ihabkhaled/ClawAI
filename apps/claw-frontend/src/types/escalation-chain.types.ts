import type { EscalationChainStatus } from '@/enums';
import type { TranslateFunction } from '@/types/i18n.types';
import type { OrchestrationStage } from '@/types/orchestration.types';

import type { AdvancedModuleModelSelection } from './advanced-model-selection.types';

export type EscalationChainStep = {
  provider: string;
  model: string;
  qualityThreshold?: number;
};

export type EscalationStepResult = {
  step: number;
  provider: string;
  model: string;
  content: string | null;
  qualityScore: number;
  passed: boolean;
  latencyMs: number;
  errorMessage: string | null;
};

export type EscalationChainMetadata = {
  escalationChain: true;
  stepUsed: number;
  totalSteps: number;
  escalated: boolean;
  status: EscalationChainStatus;
  stepResults: EscalationStepResult[];
  finalProvider: string;
  finalModel: string;
};

export type EscalationChainSynthesisState = {
  content: string;
  metadata: EscalationChainMetadata;
};

export type EscalationChainRequest = {
  threadId?: string;
  content: string;
  chain: EscalationChainStep[];
};

export type EscalationChainResponse = {
  messageId: string;
  threadId: string;
  prompt: string;
};

export type UseEscalationSendResult = {
  send: (data: EscalationChainRequest) => void;
  result: EscalationChainResponse | undefined;
  isPending: boolean;
  isError: boolean;
};

export type UseEscalationPollResult = {
  synthesisMessage: EscalationChainSynthesisState | null;
  isPolling: boolean;
  isSynthesisReady: boolean;
  handleViewInThread: () => void;
};

export type UseEscalationPageReturn = {
  t: TranslateFunction;
  // The PRIMARY model (step 1 of the escalation chain). Surfaced through
  // <OrchestrationSingleModelSelect> in the shared orchestration shell.
  // Submit is gated on `selectedModel !== null` AND prompt is non-empty.
  selectedModel: AdvancedModuleModelSelection;
  setSelectedModel: (selection: AdvancedModuleModelSelection) => void;
  // Additional escalation steps beyond the primary. The total chain
  // submitted to the BE is `[selectedModel, ...additionalChainModels]`.
  // BE enforces total chain length ≥ MIN_CHAIN_STEPS (2) and ≤ MAX_CHAIN_STEPS (5).
  additionalChainModels: EscalationChainStep[];
  prompt: string;
  setPrompt: (value: string) => void;
  handleAddModel: (provider: string, model: string) => void;
  handleRemoveModel: (index: number) => void;
  handleMoveUp: (index: number) => void;
  handleMoveDown: (index: number) => void;
  handleSend: () => void;
  isPending: boolean;
  isError: boolean;
  // True iff the user can submit right now: a primary model is picked,
  // the prompt is non-empty, the combined chain length is within bounds,
  // and no run is currently in flight.
  canSubmit: boolean;
  selectionError: string | null;
  // Live progress projected from chat-service SSE `orchestration_stage`
  // events for the current threadId. Drives the shell's stage timeline.
  stages: OrchestrationStage[];
  synthesisMessage: EscalationChainSynthesisState | null;
  isPolling: boolean;
  isSynthesisReady: boolean;
  handleViewInThread: () => void;
};
