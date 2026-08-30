import { Logger } from '@nestjs/common';

import {
  DEPENDENCY_CIRCUIT_FAILURE_THRESHOLD,
  DEPENDENCY_CIRCUIT_OPEN_MS,
} from '../constants/dependency-circuit.constants';
import { type CircuitState } from '../types/dependency-circuit.types';

/**
 * Stops a dead dependency from being retried on every request.
 *
 * memory-service makes three unattended calls to ollama-service — embeddings
 * for semantic search, generation for memory extraction, and generation for
 * sensitivity classification — and all three swallow their failures so a
 * missing model degrades the feature rather than breaking the request. That is
 * the right behaviour, and it hid a real cost: measured on a running stack with
 * no models installed, each call failed after 4–10 seconds and was made again
 * on the very next message.
 *
 * At sixteen concurrent generations, sixteen ten-second extraction calls in
 * flight starved the retrieval path badly enough that it hit its own five-second
 * timeout — a dead optional feature taking down a working one.
 *
 * KEYED, not global. Embeddings and generation are different endpoints that can
 * fail independently; one breaker for both would disable working semantic
 * search because generation was down.
 *
 * Module-level state on purpose: it protects process-wide dependencies, and a
 * per-instance breaker would open once per collaborator instead of once.
 */
const logger = new Logger('DependencyCircuit');

const circuits = new Map<string, CircuitState>();

function stateFor(key: string): CircuitState {
  const existing = circuits.get(key);
  if (existing !== undefined) return existing;
  const created: CircuitState = { consecutiveFailures: 0, openUntil: 0, probeInFlight: false };
  circuits.set(key, created);
  return created;
}

/** True while the breaker is open and calls to `key` should not be attempted. */
export function isCircuitOpen(key: string): boolean {
  return Date.now() < stateFor(key).openUntil;
}

/** Milliseconds until the breaker closes. Zero when it is already closed. */
export function circuitRemainingMs(key: string): number {
  return Math.max(0, stateFor(key).openUntil - Date.now());
}

export function recordCircuitSuccess(key: string): void {
  const state = stateFor(key);
  if (state.consecutiveFailures > 0 || state.openUntil > 0) {
    logger.log(`${key} recovered — circuit closed`);
  }
  state.consecutiveFailures = 0;
  state.openUntil = 0;
  state.probeInFlight = false;
}

export function recordCircuitFailure(key: string): void {
  const state = stateFor(key);
  state.consecutiveFailures += 1;
  if (state.consecutiveFailures < DEPENDENCY_CIRCUIT_FAILURE_THRESHOLD) {
    return;
  }
  state.openUntil = Date.now() + DEPENDENCY_CIRCUIT_OPEN_MS;
  state.probeInFlight = false;
  logger.warn(
    `${key} failed ${String(state.consecutiveFailures)} times — circuit open for ${String(
      DEPENDENCY_CIRCUIT_OPEN_MS / 1000,
    )}s; the feature behind it degrades until it closes`,
  );
}

/**
 * Runs `call`, or fails instantly while the breaker is open.
 *
 * Callers already treat a throw as "no result, carry on"; this only changes how
 * long they wait to learn it.
 */
export async function throughCircuit<T>(key: string, call: () => Promise<T>): Promise<T> {
  const state = stateFor(key);
  if (isCircuitOpen(key)) {
    throw new Error(
      `${key} unavailable — circuit open for another ${String(
        Math.ceil(circuitRemainingMs(key) / 1000),
      )}s`,
    );
  }
  // Half-open. Once the open window elapses the breaker lets exactly ONE call
  // through to test the dependency; everyone else keeps failing fast until that
  // trial resolves. Without this the breaker only throttles the RATE of bursts,
  // not their SIZE — measured at sixteen concurrent generations, all sixteen
  // were admitted the moment the window expired and starved the retrieval path
  // into its own timeout, which is the failure the breaker was added to stop.
  const recovering = state.consecutiveFailures >= DEPENDENCY_CIRCUIT_FAILURE_THRESHOLD;
  if (recovering) {
    if (state.probeInFlight) {
      throw new Error(`${key} unavailable — a recovery probe is already in flight`);
    }
    state.probeInFlight = true;
  }
  try {
    const result = await call();
    recordCircuitSuccess(key);
    return result;
  } catch (error) {
    state.probeInFlight = false;
    recordCircuitFailure(key);
    throw error;
  }
}

/**
 * Test seam. Production never calls this — the breaker's whole point is that it
 * survives across requests, which means it survives across tests unless reset.
 */
export function resetCircuits(): void {
  circuits.clear();
}
