import { ProviderBreakerReason } from '../enums/provider-breaker-reason.enum';
import {
  type ProviderBreakerState,
  type SkippedProviderView,
  type StoredProviderBreakerState,
} from '../types/provider-circuit-breaker.types';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBreakerReason(value: unknown): value is ProviderBreakerReason {
  return (
    typeof value === 'string' && new Set<string>(Object.values(ProviderBreakerReason)).has(value)
  );
}

/**
 * Reads one Redis state value back. Anything that is not the shape this
 * service writes (a hand edit, an older format) is null — the caller skips
 * it rather than trusting a half-parsed row.
 */
export function parseStoredState(raw: string): StoredProviderBreakerState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  const { openUntil, trippedAt, reason } = record;
  if (!isFiniteNumber(openUntil) || !isFiniteNumber(trippedAt)) {
    return null;
  }
  return !isBreakerReason(reason) ? null : { openUntil, trippedAt, reason };
}

/** The admin row for one breaker. */
export function toSkippedProviderView(
  provider: string,
  state: StoredProviderBreakerState,
  probing: boolean,
): SkippedProviderView {
  return {
    provider,
    reason: state.reason,
    skippedUntil: new Date(state.openUntil).toISOString(),
    trippedAt: new Date(state.trippedAt).toISOString(),
    probing,
  };
}

/** True while an in-memory breaker has a probe in flight that is not yet abandoned. */
export function isProbeInFlight(
  state: ProviderBreakerState,
  now: number,
  probeTtlMs: number,
): boolean {
  return state.probeAt !== null && now < state.probeAt + probeTtlMs;
}
