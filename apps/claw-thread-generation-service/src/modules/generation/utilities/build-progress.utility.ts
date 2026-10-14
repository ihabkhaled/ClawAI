import {
  ThreadFailureClass,
  ThreadFailureRemedy,
  type ThreadGenerationFailure,
  type ThreadGenerationSelectionRole,
  type ThreadGenerationStep,
  type ThreadGenerationStepRoleKind,
  type ThreadModelRef,
} from '@claw/shared-types';

import { GenerationBudgetCloseStatus } from '../../../common/enums/generation-budget-close-status.enum';
import {
  STEP_CANCELLED_CODE,
  STEP_FINAL_STAGE,
  STEP_GENERATION_FAILED_CODE,
} from '../constants/step-recorder.constants';
import { enqueueGenerationSchema } from '../dto/enqueue-generation.dto';
import { OUTPUT_CUSTOM_ISSUE_TEXT } from '../constants/output-failure.constants';
import { ModelOutputFailureKind } from '../../../common/enums/model-output-failure-kind.enum';
import { buildHealingSummary } from './build-healing-summary.utility';
import { classifyFailure } from './classify-failure.utility';
import { suggestModel } from './suggest-model.utility';
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

/**
 * A plain "Try again" is offered unless the class says nothing changes without the owner (spent
 * credit). A refunded Free allowance is the platform's own accounting, so a retry is free again.
 */
function isRetryable(job: ProgressJobRecord, classRetryable: boolean): boolean {
  const refunded = job.budgetCloseStatus === GenerationBudgetCloseStatus.PLATFORM_FAILED;
  return (
    (job.status === 'FAILED' || job.status === 'CANCELLED') &&
    (classRetryable || refunded) &&
    enqueueGenerationSchema.safeParse(job.request).success
  );
}

/** The kind of refusal a step's excerpt starts with ("TRUNCATED: ..."), or undefined. */
function outputKindOf(excerpt: string | null): ModelOutputFailureKind | undefined {
  const lead = excerpt?.split(':')[0]?.trim() ?? '';
  return Object.values(ModelOutputFailureKind).find((kind) => kind === lead);
}

function remediesFor(
  remedies: readonly ThreadFailureRemedy[],
  suggested: ThreadModelRef | null,
  retryable: boolean,
): ThreadFailureRemedy[] {
  return remedies.filter(
    (remedy) =>
      (remedy !== ThreadFailureRemedy.TRY_SUGGESTED_MODEL || suggested !== null) &&
      (remedy !== ThreadFailureRemedy.TRY_AGAIN || retryable),
  );
}

function toFailure(
  job: ProgressJobRecord,
  request: ProgressRequest,
  steps: StepRow[],
): ThreadGenerationFailure | null {
  if (job.status === 'CANCELLED') {
    const cancelled = classifyFailure({
      code: STEP_CANCELLED_CODE,
      httpStatus: null,
      stage: job.stage,
    });
    return {
      code: STEP_CANCELLED_CODE,
      failedStage: job.stage,
      roleId: null,
      httpStatus: null,
      retryable: isRetryable(job, cancelled.retryable),
      phase: cancelled.phase,
      failureClass: ThreadFailureClass.CANCELLED,
      remedies: [ThreadFailureRemedy.TRY_AGAIN],
      suggestedModel: null,
    };
  }
  if (job.status !== 'FAILED') return null;
  const last = lastFailedStep(steps);
  const blamed = blamedRoleStep(steps);
  const code = last?.code ?? job.safeErrorCode ?? STEP_GENERATION_FAILED_CODE;
  const failedStage =
    blamed?.stage ?? (last && last.stage !== STEP_FINAL_STAGE ? last.stage : job.stage);
  const classification = classifyFailure({
    code,
    httpStatus: last?.httpStatus ?? null,
    stage: failedStage,
    outputKind: outputKindOf(blamed?.excerpt ?? last?.excerpt ?? null),
    citationRule: (blamed?.excerpt ?? last?.excerpt ?? '').includes(OUTPUT_CUSTOM_ISSUE_TEXT),
  });
  const retryable = isRetryable(job, classification.retryable);
  // Only a class that offers a model change carries a suggestion.
  const suggestedModel = classification.remedies.includes(ThreadFailureRemedy.TRY_SUGGESTED_MODEL)
    ? suggestModel(request, blamed?.roleId ?? null, steps)
    : null;
  return {
    code,
    failedStage,
    roleId: blamed?.roleId ?? null,
    httpStatus: last?.httpStatus ?? null,
    retryable,
    phase: classification.phase,
    failureClass: classification.failureClass,
    remedies: remediesFor(classification.remedies, suggestedModel, retryable),
    suggestedModel,
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
    failure: toFailure(job, request, steps),
    healing: buildHealingSummary(steps, job.status === 'RUNNING' || job.status === 'QUEUED'),
    steps: steps.map(toStep),
  };
}
