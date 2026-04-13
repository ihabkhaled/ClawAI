import type { EscalationChainStatus } from '@/enums';

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
  t: (key: string, params?: Record<string, string | number>) => string;
  chainModels: EscalationChainStep[];
  prompt: string;
  setPrompt: (value: string) => void;
  handleAddModel: (provider: string, model: string) => void;
  handleRemoveModel: (index: number) => void;
  handleMoveUp: (index: number) => void;
  handleMoveDown: (index: number) => void;
  handleSend: () => void;
  isPending: boolean;
  isError: boolean;
  canSend: boolean;
  selectionError: string | null;
  synthesisMessage: EscalationChainSynthesisState | null;
  isPolling: boolean;
  isSynthesisReady: boolean;
  handleViewInThread: () => void;
};
