import { createHmac } from 'node:crypto';
import { ROUTINE_WEBHOOK_SECRET_LABEL } from '../constants/routine-webhook.constants';

/**
 * A routine's webhook secret, derived rather than stored.
 *
 * HMAC over a fixed label, the secret version and the routine id: the database
 * never holds a secret that could leak, one routine's secret says nothing about
 * another's, and bumping `version` retires the old secret at once. The version
 * comes first and is numeric, so no routine id can be read as a version.
 */
export function deriveRoutineWebhookSecret(
  masterKey: string,
  routineId: string,
  version: number,
): string {
  return createHmac('sha256', masterKey)
    .update(`${ROUTINE_WEBHOOK_SECRET_LABEL}:${version}:${routineId}`)
    .digest('hex');
}
