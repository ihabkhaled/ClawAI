import type { ThreadGenerationFailedPayload, ThreadGenerationFailedRole } from '@claw/shared-types';
import { failureRoleSchema, requestRolesSchema } from '../constants/failure-report.constants';
import type { FailedJobRecord } from '../types/failure-report.types';

/** Only the fields an operator needs to see which models ran. */
function toRole(value: unknown): ThreadGenerationFailedRole[] {
  const parsed = failureRoleSchema.safeParse(value);
  if (!parsed.success) return [];
  const { id, provider, model, fallbacks } = parsed.data;
  return [{ roleId: id, provider, model, fallbacks }];
}

/**
 * The event for an operator ticket. Built field by field, never by spreading the
 * job: the row also holds the source conversation, evidence and prompts, none of
 * which may leave this service in a failure report.
 */
export function toFailedPayload(job: FailedJobRecord): ThreadGenerationFailedPayload {
  const request = requestRolesSchema.safeParse(job.request);
  const roles = request.success
    ? [
        ...request.data.authors.flatMap(toRole),
        ...toRole(request.data.judge),
        ...toRole(request.data.critic),
      ]
    : [];
  return {
    jobId: job.id,
    correlationId: job.correlationId,
    errorCode: job.safeErrorCode ?? 'GENERATION_FAILED',
    ownerId: job.ownerId,
    failedStage: job.stage,
    attemptCount: job.attemptCount,
    failureSummary: job.failureSummary,
    sourceSnapshotHash: job.sourceSnapshotHash,
    budgetCloseStatus: job.budgetCloseStatus,
    roles,
    queuedAt: job.createdAt.toISOString(),
    startedAt: job.attempts[0]?.startedAt.toISOString() ?? null,
    failedAt: (job.completedAt ?? job.updatedAt).toISOString(),
  };
}
