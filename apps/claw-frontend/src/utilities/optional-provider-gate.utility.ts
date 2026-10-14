import {
  OPTIONAL_PROVIDER_ABSENT_STATUSES,
  OPTIONAL_PROVIDER_BACKOFF_BASE_MS,
  OPTIONAL_PROVIDER_BACKOFF_CAP_MS,
  OPTIONAL_PROVIDER_FOCUS_RECHECK_MS,
  OPTIONAL_PROVIDER_UNAVAILABLE_CODE,
  OPTIONAL_PROVIDER_UNAVAILABLE_MESSAGE,
  OPTIONAL_PROVIDER_UNAVAILABLE_STATUS,
} from '@/constants/optional-provider-gate.constants';
import { ApiClientError } from '@/services/shared/api-client';

type GateState = { absent: boolean; failures: number; nextAttemptAt: number };

const gates = new Map<string, GateState>();
let lastFocusRecheck = 0;
let focusListenerInstalled = false;

function stateOf(provider: string): GateState {
  const existing = gates.get(provider);
  if (existing !== undefined) {
    return existing;
  }
  const fresh: GateState = { absent: false, failures: 0, nextAttemptAt: 0 };
  gates.set(provider, fresh);
  return fresh;
}

/** Forget what was learned about a provider, so the next call really asks (manual refresh, page open). */
export function resetOptionalProvider(provider?: string): void {
  if (provider === undefined) {
    gates.clear();
    return;
  }
  gates.delete(provider);
}

function installFocusRecheck(): void {
  if (focusListenerInstalled || typeof window === 'undefined') {
    return;
  }
  focusListenerInstalled = true;
  window.addEventListener('focus', () => {
    const now = Date.now();
    if (now - lastFocusRecheck < OPTIONAL_PROVIDER_FOCUS_RECHECK_MS) {
      return;
    }
    lastFocusRecheck = now;
    resetOptionalProvider();
  });
}

function unavailable(): ApiClientError {
  return new ApiClientError({
    message: OPTIONAL_PROVIDER_UNAVAILABLE_MESSAGE,
    status: OPTIONAL_PROVIDER_UNAVAILABLE_STATUS,
    code: OPTIONAL_PROVIDER_UNAVAILABLE_CODE,
  });
}

/**
 * Runs a request to an OPTIONAL service through a per-session gate. A service that answers 404/502/503
 * is treated as absent: no further request is sent until the window regains focus or the gate is reset.
 * Any other failure backs off exponentially (capped). While closed, the call fails at once with no network.
 */
export async function throughOptionalProvider<T>(
  provider: string,
  request: () => Promise<T>,
  now: () => number = Date.now,
): Promise<T> {
  installFocusRecheck();
  const state = stateOf(provider);
  if (state.absent || now() < state.nextAttemptAt) {
    throw unavailable();
  }
  try {
    const result = await request();
    gates.delete(provider);
    return result;
  } catch (error) {
    if (error instanceof ApiClientError && OPTIONAL_PROVIDER_ABSENT_STATUSES.has(error.status)) {
      state.absent = true;
    } else {
      state.failures += 1;
      const wait = Math.min(
        OPTIONAL_PROVIDER_BACKOFF_BASE_MS * 2 ** (state.failures - 1),
        OPTIONAL_PROVIDER_BACKOFF_CAP_MS,
      );
      state.nextAttemptAt = now() + wait;
    }
    throw error;
  }
}
