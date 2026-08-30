import { Logger } from '@nestjs/common';

import {
  EMBEDDING_CIRCUIT_FAILURE_THRESHOLD,
  EMBEDDING_CIRCUIT_OPEN_MS,
} from '../constants/embeddings.constants';

/**
 * Stops a dead embedding backend from being retried on every request.
 *
 * Measured on a running stack: with no embedding model installed, the Ollama
 * call fails after ~4 seconds, and memory retrieval swallowed that failure and
 * returned results anyway — correct behaviour, except that it paid the four
 * seconds again on the very next turn, and the one after that. Every chat turn
 * carried a four-second delay for a call that could not succeed.
 *
 * It became a hot path when chat generation migrated to the canonical retrieval
 * route (ADR-086 finding F-05). The failure was always there; the migration is
 * what put it in front of every message.
 *
 * Deliberately module-level rather than injectable: the thing being protected
 * is a single external dependency shared by every caller in the process, and a
 * per-instance breaker would open once per collaborator instead of once.
 */
const logger = new Logger('EmbeddingCircuit');

let consecutiveFailures = 0;
let openUntil = 0;

/** True while the breaker is open and calls should not be attempted. */
export function isEmbeddingCircuitOpen(): boolean {
  return Date.now() < openUntil;
}

/** Milliseconds until the breaker closes. Zero when it is already closed. */
export function embeddingCircuitRemainingMs(): number {
  return Math.max(0, openUntil - Date.now());
}

export function recordEmbeddingSuccess(): void {
  if (consecutiveFailures > 0 || openUntil > 0) {
    logger.log('embedding backend recovered — circuit closed');
  }
  consecutiveFailures = 0;
  openUntil = 0;
}

export function recordEmbeddingFailure(): void {
  consecutiveFailures += 1;
  if (consecutiveFailures < EMBEDDING_CIRCUIT_FAILURE_THRESHOLD) {
    return;
  }
  openUntil = Date.now() + EMBEDDING_CIRCUIT_OPEN_MS;
  logger.warn(
    `embedding backend failed ${String(consecutiveFailures)} times — circuit open for ${String(
      EMBEDDING_CIRCUIT_OPEN_MS / 1000,
    )}s; semantic search degrades to lexical until it closes`,
  );
}

/**
 * Test seam. Production never calls this — the breaker's whole point is that it
 * survives across requests, which means it survives across tests too unless a
 * test resets it.
 */
export function resetEmbeddingCircuit(): void {
  consecutiveFailures = 0;
  openUntil = 0;
}
