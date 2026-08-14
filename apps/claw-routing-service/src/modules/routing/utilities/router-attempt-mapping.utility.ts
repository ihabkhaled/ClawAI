import type { RouterAttemptRecord } from '../types/router-inference.types';
import type { ProviderAttemptRecord } from '../types/router-attempt.types';

/**
 * Converts the coordinator's in-memory attempts into persistable rows.
 *
 * `attemptOrder` is the position across the WHOLE walk, not the per-entry
 * attemptNumber the coordinator tracks. Two entries both reporting attempt 1
 * would collide on the (traceId, attemptOrder) unique and silently drop one of
 * them, losing exactly the fallback evidence these rows exist to keep.
 */
export function toAttemptRecords(
  traceId: string,
  attempts: readonly RouterAttemptRecord[],
  decisionId: string | null = null,
): ProviderAttemptRecord[] {
  return attempts.map((attempt, index) => ({
    traceId,
    decisionId,
    attemptOrder: index + 1,
    chainEntryId: attempt.entryId,
    chainOrder: attempt.order,
    provider: attempt.provider,
    providerModelId: attempt.providerModelId,
    deploymentId: attempt.deploymentId,
    succeeded: attempt.outcome === 'SUCCESS',
    errorCode: attempt.code,
    safeMessage: attempt.safeMessage,
    wasRepair: attempt.wasRepair,
    latencyMs: attempt.latencyMs,
    inputTokens: null,
    outputTokens: null,
  }));
}
