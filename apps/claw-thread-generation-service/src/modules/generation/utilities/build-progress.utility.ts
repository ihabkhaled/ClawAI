import type {
  ThreadGenerationFailure,
  ThreadGenerationSelectionRole,
  ThreadGenerationStep,
  ThreadGenerationStepRoleKind,
} from '@claw/shared-types';

import { GenerationBudgetCloseStatus } from '../../../common/enums/generation-budget-close-status.enum';
import {
  NON_RETRYABLE_STEP_CODES,
  STEP_CANCELLED_CODE,
  STEP_FINAL_STAGE,
  STEP_GENERATION_FAILED_CODE,
} from '../constants/step-recorder.constants';
import { enqueueGenerationSchema } from '../dto/enqueue-generation.dto';
import { MAX_GENERATION_ATTEMPTS } from '../constants/generation.constants';
import { STEP_OUTCOMES, STEP_ROLE_KINDS } from '../constants/step-progress.constants';
import type { ThreadGenerationProgressCore } from '../types/generation-progress.types';
import type { ProgressJobRecord, ProgressRequest } from '../types/generation-progress-source.types';
import type { StepRow } from '../types/step-recorder.types';

function toStep(row: StepRow): ThreadGenerationStep {
  return {
    seq: row.seq,
    at: row.at.toISOString(),
    stage: row.stage,
    round: row.round,
    outcome: STEP_OUTCOMES.find((value) => value === row.outcome) ?? 'FAILED',
    roleKind: STEP_ROLE_KINDS.find((value) => value === row.roleKind) ?? 'SYSTEM',
    roleId: row.roleId,
    provider: row.provider,
    model: row.model,
    code: row.code,
    httpStatus: row.httpStatus,
    durationMs: row.durationMs,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    excerpt: row.excerpt,
  };
}

function toRole(
  role: ProgressRequest['judge'],
  roleKind: ThreadGenerationStepRoleKind,
): ThreadGenerationSelectionRole {
  return {
    roleId: role.id,
    roleKind,
    provider: role.provider,
    model: role.model,
    fallbacks: role.fallbacks.map(({ provider, model }) => ({ provider, model })),
  };
}

function lastFailedStep(steps: StepRow[]): StepRow | undefined {
  return [...steps].reverse().find((step) => step.outcome === 'FAILED');
}

/** The last failed role step that no later success for the same role cleared (a recovered fallback is not blamed). */
function blamedRoleStep(steps: StepRow[]): StepRow | undefined {
  return [...steps].reverse().find((step) => {
    return step.outcome !== 'FAILED' || step.roleKind === 'SYSTEM'
      ? false
      : !steps.some(
          (later) =>
            later.seq > step.seq &&
            later.outcome === 'SUCCEEDED' &&
            later.roleKind === step.roleKind &&
            later.roleId === step.roleId,
        );
  });
}

/** A failure only the owner can fix (cap, credit, unpriced model) is never offered as a Retry. */
function isRetryable(job: ProgressJobRecord, failureCode: string | null): boolean {
  return (
    (job.status === 'FAILED' || job.status === 'CANCELLED') &&
    !(failureCode !== null && NON_RETRYABLE_STEP_CODES.has(failureCode)) &&
    enqueueGenerationSchema.safeParse(job.request).success
  );
}

function toFailure(job: ProgressJobRecord, steps: StepRow[]): ThreadGenerationFailure | null {
  if (job.status === 'CANCELLED') {
    return {
      code: STEP_CANCELLED_CODE,
      failedStage: job.stage,
      roleId: null,
      httpStatus: null,
      retryable: isRetryable(job, null),
    };
  }
  if (job.status !== 'FAILED') return null;
  const last = lastFailedStep(steps);
  const blamed = blamedRoleStep(steps);
  const code = last?.code ?? job.safeErrorCode ?? STEP_GENERATION_FAILED_CODE;
  return {
    code,
    failedStage:
      blamed?.stage ?? (last && last.stage !== STEP_FINAL_STAGE ? last.stage : job.stage),
    roleId: blamed?.roleId ?? null,
    httpStatus: last?.httpStatus ?? null,
    retryable: isRetryable(job, code),
  };
}

export function buildProgress(
  job: ProgressJobRecord,
  request: ProgressRequest,
  steps: StepRow[],
): ThreadGenerationProgressCore {
  return {
    jobId: job.id,
    status: job.status,
    stage: job.stage,
    round: job.round,
    attemptCount: job.attemptCount,
    maxAttempts: MAX_GENERATION_ATTEMPTS,
    spentMicroCredits: job.spentMicroCredits.toString(),
    allowanceRefunded: job.budgetCloseStatus === GenerationBudgetCloseStatus.PLATFORM_FAILED,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    selections: {
      topic: request.topic,
      publicationType: request.publicationType,
      contentLocale: request.contentLocale,
      sourceThreadId: job.sourceThreadId,
      spendCapMicroUsd: job.spendCapMicroUsd.toString(),
      roles: [
        ...request.authors.map((author) => toRole(author, 'AUTHOR')),
        toRole(request.judge, 'JUDGE'),
        toRole(request.critic, 'CRITIC'),
      ],
    },
    failure: toFailure(job, steps),
    steps: steps.map(toStep),
  };
}
