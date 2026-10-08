export interface ThreadGenerationRequestedPayload {
  jobId: string;
  correlationId: string;
  requestedAt: string;
}

export interface ThreadGenerationCompletedPayload {
  jobId: string;
  correlationId: string;
  ownerId: string;
}

/** A model role as the job was configured. Never a key, prompt or response. */
export interface ThreadGenerationFailedRole {
  roleId: string;
  provider: string;
  model: string;
  fallbacks: Array<{ provider: string; model: string }>;
}

/**
 * Safe diagnostics for a job that ended FAILED. By construction it carries no
 * conversation text, evidence, draft, prompt, token or header: only ids, hashes,
 * counts, timings and short machine-readable summaries.
 */
export interface ThreadGenerationFailedPayload {
  jobId: string;
  correlationId: string;
  errorCode: string;
  ownerId: string;
  failedStage: string;
  attemptCount: number;
  failureSummary: string | null;
  sourceSnapshotHash: string;
  budgetCloseStatus: string | null;
  roles: ThreadGenerationFailedRole[];
  queuedAt: string;
  startedAt: string | null;
  failedAt: string;
}
