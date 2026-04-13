import type { EscalationChainStatus } from '../../../common/enums/escalation-chain-status.enum';

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

export type EscalationChainResult = {
  finalAnswer: string;
  stepUsed: number;
  totalSteps: number;
  escalated: boolean;
  status: EscalationChainStatus;
  stepResults: EscalationStepResult[];
  finalProvider: string;
  finalModel: string;
};

export type EscalationChainResponse = {
  messageId: string;
  threadId: string;
  prompt: string;
};
