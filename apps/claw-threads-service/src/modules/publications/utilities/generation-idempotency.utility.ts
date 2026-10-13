import { createHash } from 'node:crypto';

import { FINGERPRINT_EXCLUDED_FIELDS } from '../constants/generation-preflight.constants';
import type { StartThreadGenerationDto } from '../dto/start-thread-generation.dto';

/**
 * The key the generation service and the budget service see. It is a hash of the owner and the
 * client's key, so two owners can use the same key without meeting, and a stranger cannot learn
 * that a key exists by getting a conflict. Same owner and key always give the same value.
 */
export function scopedIdempotencyKey(ownerId: string, idempotencyKey: string): string {
  return createHash('sha256')
    .update(JSON.stringify([ownerId, idempotencyKey]))
    .digest('hex');
}

/** Plain code-point order, so the same request always serialises the same way. */
function byCodePoint([left]: [string, unknown], [right]: [string, unknown]): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(byCodePoint)
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/**
 * Identifies what a start request asks for. The idempotency key and the correlation id are left
 * out on purpose: the first names the request and the second is only a tracing label, so a client
 * that repeats a request with a fresh trace id still gets the same job back.
 */
export function startRequestFingerprint(input: StartThreadGenerationDto): string {
  const request = Object.fromEntries(
    Object.entries(input).filter(([name]) => !FINGERPRINT_EXCLUDED_FIELDS.includes(name)),
  );
  return createHash('sha256').update(canonical(request)).digest('hex');
}
