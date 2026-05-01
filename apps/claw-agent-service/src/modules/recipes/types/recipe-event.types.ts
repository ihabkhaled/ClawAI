import type { CapabilityInvocationStatus } from '../../../common/enums/capability-invocation-status.enum';

export type CapabilityTerminalEventPayload = {
  invocationId: string;
  recipeRunId?: string | null;
  executionResult?: Record<string, unknown> | null;
  errorMessage?: string | null;
};

/**
 * Subset of CapabilityInvocationStatus values that the recipe runner
 * acts on (only the three terminal states that affect run progression).
 */
export type CapabilityTerminalKind = CapabilityInvocationStatus;

export type StepMetadata = {
  attempt?: number;
  retryScheduledFor?: number;
  failedFromStepId?: string;
  fallbackOf?: string;
};

export enum ProcessStepResult {
  PROPOSED = 'PROPOSED',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED',
}
