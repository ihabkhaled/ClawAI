import { createHash } from 'node:crypto';

/**
 * The idempotency identity of one enhancement. The user id is part of the hash, so one user's key can
 * never collide with another's; without a client key it is derived from what is being enhanced.
 */
export function buildEnhanceRequestId(
  userId: string,
  eventId: string,
  eventVersion: number,
  modelId: string,
  clientKey: string | undefined,
): string {
  const identity = clientKey ?? `${eventId}|${String(eventVersion)}|${modelId}`;
  return `live-enh-${createHash('sha256').update(`${userId}|${identity}`).digest('hex')}`;
}
