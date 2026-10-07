export type FailedJobRecord = {
  id: string;
  ownerId: string;
  correlationId: string;
  stage: string;
  attemptCount: number;
  safeErrorCode: string | null;
  failureSummary: string | null;
  sourceSnapshotHash: string;
  budgetCloseStatus: string | null;
  request: unknown;
  createdAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
  attempts: Array<{ startedAt: Date }>;
};
