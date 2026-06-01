import type { RepairType } from '@/enums/repair-type.enum';
import type {
  AdvancedModuleModelSelection,
  AdvancedModelSelectionPayload,
} from '@/types/advanced-model-selection.types';
import type { TranslateFunction } from '@/types/i18n.types';
import type { OrchestrationStage } from '@/types/orchestration.types';

export type RepairRequest = AdvancedModelSelectionPayload & {
  messageId?: string;
  content?: string;
  threadId?: string;
  repairTypes: RepairType[];
  targetProvider?: string;
  targetModel?: string;
};

export type RepairResponse = {
  messageId: string;
  threadId: string;
};

export type RepairMetadata = {
  repaired: true;
  repairTypes: RepairType[];
  repairProvider: string;
  repairModel: string;
};

export type RepairResultState = {
  content: string;
  metadata: RepairMetadata;
};

export type UseRepairSendResult = {
  send: (data: RepairRequest) => void;
  result: RepairResponse | undefined;
  isPending: boolean;
  isError: boolean;
};

export type UseRepairPollResult = {
  repairMessage: RepairResultState | null;
  isPolling: boolean;
  isRepairReady: boolean;
  isRepairError: boolean;
  handleViewInThread: () => void;
};

export type UseRepairPageReturn = {
  t: TranslateFunction;
  content: string;
  setContent: (value: string) => void;
  selectedRepairTypes: RepairType[];
  handleToggleRepairType: (type: RepairType) => void;
  selectedModel: AdvancedModuleModelSelection;
  setSelectedModel: (value: AdvancedModuleModelSelection) => void;
  handleSend: () => void;
  isPending: boolean;
  isError: boolean;
  isRepairError: boolean;
  // Legacy gate retained for back-compat with the existing button-label
  // logic. New shell-aware gate is `canSubmit`.
  canSend: boolean;
  // Shell gate: true iff content has a real repair body AND ≥1 repair
  // type is ticked AND a local model has been picked AND no run is in
  // flight. The orchestration shell disables the submit button on
  // `!canSubmit` directly.
  canSubmit: boolean;
  repairMessage: RepairResultState | null;
  isPolling: boolean;
  isRepairReady: boolean;
  handleViewInThread: () => void;
  // Live stage timeline projected from the chat-service SSE channel.
  // Populated while a run is in flight; the shell renders it inside the
  // live-progress panel above the loading skeleton.
  stages: OrchestrationStage[];
  // True iff at least one stage row has arrived — gates the swap from
  // the loading skeleton to the live-progress timeline inside the
  // orchestration shell.
  hasProgress: boolean;
  // Localised error string surfaced to the shell's Alert primitive.
  // `null` when no error is active.
  errorMessage: string | null;
};
