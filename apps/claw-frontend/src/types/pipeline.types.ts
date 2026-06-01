import type {
  AdvancedModuleModelSelection,
  AdvancedModelSelectionPayload,
} from './advanced-model-selection.types';
import type { TranslateFunction } from './i18n.types';
import type { OrchestrationStage } from './orchestration.types';

export type PipelineStageResult = {
  stageName: string;
  model: string;
  output: string;
  latencyMs: number;
};

export type PipelineMetadata = {
  pipeline: boolean;
  template: string;
  stages: PipelineStageResult[];
  stageCount: number;
};

export type PipelineResult = {
  content: string;
  metadata: PipelineMetadata;
};

export type SendPipelinePayload = AdvancedModelSelectionPayload & {
  content: string;
  template: string;
};

export type SendPipelineResult = {
  messageId: string;
  threadId: string;
};

export type UseSendPipelineResult = {
  mutate: (payload: SendPipelinePayload) => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  data: SendPipelineResult | undefined;
};

export type UsePipelinePollResult = {
  pipelineResult: PipelineResult | null;
  isPolling: boolean;
  isPipelineReady: boolean;
  isPipelineError: boolean;
  handleViewInThread: () => void;
};

export type UsePipelinePageReturn = {
  t: TranslateFunction;
  content: string;
  setContent: (value: string) => void;
  template: string;
  setTemplate: (value: string) => void;
  selectedModel: AdvancedModuleModelSelection;
  setSelectedModel: (value: AdvancedModuleModelSelection) => void;
  handleSend: () => void;
  canSend: boolean;
  canSubmit: boolean;
  isPending: boolean;
  isError: boolean;
  isPipelineError: boolean;
  pipelineResult: PipelineResult | null;
  isPolling: boolean;
  isPipelineReady: boolean;
  stages: OrchestrationStage[];
  hasProgress: boolean;
  errorMessage: string | null;
  handleViewInThread: () => void;
};
