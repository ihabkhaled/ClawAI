import type { SessionTerminationReason } from '../enums/session-termination-reason.enum';
import type { SessionTerminationData } from '../types/session-admin.types';

/** The columns written when a session is closed on purpose: one shape for every closer (ADR-204). */
export function buildTerminationData(
  reason: SessionTerminationReason,
  at: Date = new Date(),
  actorUserId: string | null = null,
): SessionTerminationData {
  return {
    revokedAt: at,
    terminatedAt: at,
    terminationReason: reason,
    terminatedByUserId: actorUserId,
  };
}
