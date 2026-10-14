import { stableJson } from './stable-json.utility';

function withoutHealing(request: unknown): unknown {
  if (typeof request !== 'object' || request === null || Array.isArray(request)) return request;
  const { healing: _healing, ...rest } = request as Record<string, unknown>;
  return rest;
}

/**
 * Whether two stored/incoming job requests ask for the same generation. The healing pool is
 * ignored: it is chosen by threads-service from the plan and the catalog at that moment, so a
 * repeat of the same start (same idempotency key) may carry a different pool and must still be
 * the same generation, not a 409 (ADR-181).
 */
export function isSameRequest(stored: unknown, incoming: unknown): boolean {
  return stableJson(withoutHealing(stored)) === stableJson(withoutHealing(incoming));
}
