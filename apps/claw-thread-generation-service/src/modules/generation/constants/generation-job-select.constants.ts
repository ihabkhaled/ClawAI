import type { Prisma } from '../../../generated/prisma';

export const REVISION_PARENT_SELECT = {
  id: true,
  ownerId: true,
  sourceThreadId: true,
  sourceSnapshot: true,
  sourceSnapshotHash: true,
  evidenceBundle: true,
  evidenceBundleHash: true,
  evidenceVersion: true,
  request: true,
  publicIntentVersion: true,
  publicIntentAt: true,
} as const satisfies Prisma.ThreadGenerationJobSelect;

export const OWNER_STATE_SELECT = {
  id: true,
  status: true,
  stage: true,
  round: true,
  safeErrorCode: true,
  revisions: {
    orderBy: { revision: 'desc' },
    take: 1,
    select: { content: true },
  },
} as const satisfies Prisma.ThreadGenerationJobSelect;

export const PROGRESS_JOB_SELECT = {
  id: true,
  status: true,
  stage: true,
  round: true,
  attemptCount: true,
  spentMicroCredits: true,
  budgetCloseStatus: true,
  spendCapMicroUsd: true,
  sourceThreadId: true,
  safeErrorCode: true,
  request: true,
  createdAt: true,
  updatedAt: true,
  nextAttemptAt: true,
} as const satisfies Prisma.ThreadGenerationJobSelect;

export const RETRY_SOURCE_SELECT = {
  id: true,
  status: true,
  request: true,
  sourceSnapshot: true,
  sourceSnapshotHash: true,
} as const satisfies Prisma.ThreadGenerationJobSelect;

export const DELETABLE_SELECT = {
  id: true,
  status: true,
  budgetClosedAt: true,
  retriedFromJobId: true,
} as const satisfies Prisma.ThreadGenerationJobSelect;

export const BUDGET_CLOSURE_SELECT = {
  id: true,
  budgetId: true,
  status: true,
} as const satisfies Prisma.ThreadGenerationJobSelect;

export const UNREPORTED_FAILURE_SELECT = {
  id: true,
  ownerId: true,
  correlationId: true,
  stage: true,
  attemptCount: true,
  safeErrorCode: true,
  failureSummary: true,
  sourceSnapshotHash: true,
  budgetCloseStatus: true,
  request: true,
  createdAt: true,
  completedAt: true,
  updatedAt: true,
  attempts: { orderBy: { startedAt: 'asc' }, take: 1, select: { startedAt: true } },
} as const satisfies Prisma.ThreadGenerationJobSelect;

export const DISPATCHABLE_SELECT = { id: true } as const satisfies Prisma.ThreadGenerationJobSelect;
