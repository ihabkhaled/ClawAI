import type { CostTier } from '@/enums';

import type {
  AdvancedModuleModelSelection,
  AdvancedModelSelectionPayload,
} from './advanced-model-selection.types';
import type { TranslateFunction } from './i18n.types';

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
  isPending: boolean;
  isError: boolean;
  costEnsembleResult: CostEnsembleResult | null;
  isPolling: boolean;
  isCostEnsembleReady: boolean;
  isCostEnsembleError: boolean;
  handleViewInThread: () => void;
};
