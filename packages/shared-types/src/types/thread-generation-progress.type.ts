/** Owner-only, step-by-step record of one Thread generation job. Never public. */

export type ThreadGenerationStepOutcome =
  'STARTED' | 'SUCCEEDED' | 'FAILED' | 'RETRY' | 'FALLBACK' | 'SKIPPED';

export type ThreadGenerationStepRoleKind = 'AUTHOR' | 'JUDGE' | 'CRITIC' | 'RESEARCH' | 'SYSTEM';

export type ThreadGenerationStep = {
  seq: number;
  at: string;
  stage: string;
  round: number;
  outcome: ThreadGenerationStepOutcome;
  roleKind: ThreadGenerationStepRoleKind;
  /** Request role id (e.g. author-1); null for system and research steps. */
  roleId: string | null;
  provider: string | null;
  model: string | null;
  /** Stable machine code the UI translates, e.g. PAYG_CREDIT_EXHAUSTED. */
  code: string | null;
  /** Upstream HTTP status when the step failed on a provider call. */
  httpStatus: number | null;
  durationMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  /** First part of what the model produced, owner-only, bounded, redacted. */
  excerpt: string | null;
};

export type ThreadGenerationSelectionRole = {
  roleId: string;
  roleKind: ThreadGenerationStepRoleKind;
  provider: string;
  model: string;
  fallbacks: Array<{ provider: string; model: string }>;
};

export type ThreadGenerationSelections = {
  topic: string;
  publicationType: string;
  contentLocale: string;
  sourceThreadId: string;
  spendCapMicroUsd: string;
  roles: ThreadGenerationSelectionRole[];
};

export type ThreadGenerationFailure = {
  code: string;
  failedStage: string;
  roleId: string | null;
  httpStatus: number | null;
  retryable: boolean;
};

export type ThreadGenerationProgress = {
  publicationId: string;
  jobId: string;
  status: string;
  stage: string;
  round: number;
  attemptCount: number;
  maxAttempts: number;
  spentMicroCredits: string;
  createdAt: string;
  updatedAt: string;
  selections: ThreadGenerationSelections;
  failure: ThreadGenerationFailure | null;
  steps: ThreadGenerationStep[];
};

/** Owner changes to the selections when retrying a failed generation. */
export type ThreadGenerationRetryRequest = {
  idempotencyKey: string;
  topic?: string;
  spendCapUsd?: number;
  models?: Array<{ roleId: string; provider: string; model: string }>;
};
