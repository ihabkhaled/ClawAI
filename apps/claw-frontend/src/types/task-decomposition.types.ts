import type {
  AdvancedModuleModelSelection,
  AdvancedModelSelectionPayload,
} from './advanced-model-selection.types';
import type { TranslateFunction } from './i18n.types';
import type { OrchestrationStage } from './orchestration.types';

export type SubTaskResult = {
  title: string;
  instruction: string;
  category: string;
  result: string;
  provider: string;
  model: string;
  latencyMs: number;
};

export type DecompositionMetadata = {
  decomposed: true;
  subTasks: SubTaskResult[];
};

export type DecompositionResultState = {
  content: string;
  metadata: DecompositionMetadata;
};

export type DecomposeRequest = AdvancedModelSelectionPayload & {
  content: string;
  threadId?: string;
  maxSubTasks?: number;
};

export type DecomposeResponse = {
  messageId: string;
  threadId: string;
};

export type UseDecomposeSendResult = {
  send: (data: DecomposeRequest) => void;
  result: DecomposeResponse | undefined;
  isPending: boolean;
  isError: boolean;
};

export type UseDecomposePollResult = {
  decompositionResult: DecompositionResultState | null;
  isPolling: boolean;
  isDecompositionReady: boolean;
  isDecompositionError: boolean;
  handleViewInThread: () => void;
};

export type DecomposeMaxSubTasksSelectProps = {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  t: TranslateFunction;
};

export type UseDecomposePageReturn = {
  t: TranslateFunction;
  content: string;
  setContent: (v: string) => void;
  maxSubTasks: number;
  setMaxSubTasks: (n: number) => void;
  selectedModel: AdvancedModuleModelSelection;
  setSelectedModel: (value: AdvancedModuleModelSelection) => void;
  handleSend: () => void;
  canSend: boolean;
  canSubmit: boolean;
  isPending: boolean;
  isError: boolean;
  decompositionResult: DecompositionResultState | null;
  isPolling: boolean;
  isDecompositionReady: boolean;
  isDecompositionError: boolean;
  handleViewInThread: () => void;
  stages: OrchestrationStage[];
  hasProgress: boolean;
  errorMessage: string | null;
};
