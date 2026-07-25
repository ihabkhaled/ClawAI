import { createHash, timingSafeEqual } from 'node:crypto';

// Idempotency and signature primitives shared by the payment service and any
// future service that performs a financial write.

// Canonical JSON: keys sorted at every depth so two structurally identical
// request bodies always hash the same regardless of property order.
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : 1))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalize(entryValue)}`);
  return `{${entries.join(',')}}`;
}

// Hash of the request payload, stored alongside the idempotency key.
//
// Replaying a key with a DIFFERENT body is an error, not a replay: it usually
// means a client reused a key across two distinct operations, and returning the
// first response would be wrong.
export function hashRequestPayload(payload: unknown): string {
  return createHash('sha256').update(canonicalize(payload), 'utf8').digest('hex');
}

// Idempotency is scoped by (user, operation, key) so one user's key can never
// collide with — or replay — another user's operation.
export function buildIdempotencyScope(userId: string, operation: string, key: string): string {
  return `${userId}:${operation}:${key}`;
}

// Fingerprint of a webhook body, recorded so a duplicate delivery is provable
// without retaining the raw payload (which may contain payer details).
export function hashWebhookPayload(rawBody: string): string {
  return createHash('sha256').update(rawBody, 'utf8').digest('hex');
}

// Constant-time comparison for signatures and HMACs.
//
// A plain `===` on a secret leaks its prefix through response timing; this
// compares in time independent of where the first difference falls. Length is
// checked via a hash so even a length mismatch does not short-circuit visibly.
export function secureCompare(left: string, right: string): boolean {
  const leftDigest = createHash('sha256').update(left, 'utf8').digest();
  const rightDigest = createHash('sha256').update(right, 'utf8').digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

// HMAC-style digest over an ordered field list. Gateways that sign a
// concatenation of selected fields (Paymob) need the exact same ordering on both
// sides, so the caller supplies the order explicitly rather than relying on
// object iteration.
export function concatenateOrderedFields(
  source: Readonly<Record<string, string>>,
  order: readonly string[],
): string {
  return order.map((field) => source[field] ?? '').join('');
}

// True when a signed request is too old to still be honoured, independent of
// whether its signature verifies. Bounds how long a captured request stays
// replayable if it escapes TLS.
export function isOutsideReplayWindow(
  signedAtMs: number,
  nowMs: number,
  toleranceMs: number,
): boolean {
  return Math.abs(nowMs - signedAtMs) > toleranceMs;
}
