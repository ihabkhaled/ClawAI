import type { ConsensusConfidenceLevel, ConsensusModelStatus } from '@/enums';

import type { ModelSelection } from './component.types';
import type { OrchestrationStage } from './orchestration.types';

export type ConsensusModelBreakdown = {
  provider: string;
  model: string;
  contentLength: number;
  status: ConsensusModelStatus;
};

export type ConsensusAnalysis = {
  agreementScore: number;
  agreements: string[];
  disagreements: string[];
  contradictions: string[];
  confidenceLevel: ConsensusConfidenceLevel;
  synthesisRationale: string;
};

export type ConsensusMetadata = {
  consensusSynthesis: true;
  consensusGroupId: string;
  agreementScore: number;
  agreements: string[];
  disagreements: string[];
  contradictions: string[];
  confidenceLevel: ConsensusConfidenceLevel;
  synthesisRationale: string;
  modelBreakdown: ConsensusModelBreakdown[];
  finalAnswer?: string;
};

export type ConsensusRequest = {
  threadId?: string;
  content: string;
  models: Array<{ provider: string; model: string }>;
};

export type ConsensusResponse = {
  messageId: string;
  threadId: string;
  prompt: string;
};

export type UseConsensusSendResult = {
  send: (data: ConsensusRequest) => void;
  result: ConsensusResponse | undefined;
  isPending: boolean;
  isError: boolean;
};

export type ConsensusSynthesisState = {
  content: string;
  metadata: ConsensusMetadata;
};

export type UseConsensusPollResult = {
  synthesisMessage: ConsensusSynthesisState | null;
  isPolling: boolean;
  isSynthesisReady: boolean;
  handleViewInThread: () => void;
};

export type UseConsensusPageReturn = {
  t: (key: string, params?: Record<string, string | number>) => string;
  selectedModels: Array<{ provider: string; model: string }>;
  prompt: string;
  setPrompt: (value: string) => void;
  handleToggleModel: (provider: string, model: string, checked: boolean) => void;
  handleSend: () => void;
  isPending: boolean;
  isError: boolean;
  canSend: boolean;
  canSubmit: boolean;
  selectionError: string | null;
  synthesisMessage: ConsensusSynthesisState | null;
  isPolling: boolean;
  isSynthesisReady: boolean;
  handleViewInThread: () => void;
  selectedModel: ModelSelection | null;
  setSelectedModel: (model: ModelSelection | null) => void;
  stages: OrchestrationStage[];
  hasProgress: boolean;
  errorMessage: string | null;
};
