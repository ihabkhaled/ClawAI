import {
  EMBEDDING_CIRCUIT_FAILURE_THRESHOLD,
  EMBEDDING_CIRCUIT_OPEN_MS,
} from '../../constants/embeddings.constants';
import {
  embeddingCircuitRemainingMs,
  isEmbeddingCircuitOpen,
  recordEmbeddingFailure,
  recordEmbeddingSuccess,
  resetEmbeddingCircuit,
} from '../embedding-circuit.utility';

/**
 * Measured on a running stack: with no embedding model installed, the Ollama
 * call failed after ~4 seconds and memory retrieval paid that on EVERY chat
 * turn. The breaker turns a per-turn cost into a per-half-minute one.
 */
describe('embedding circuit', () => {
  beforeEach(() => {
    resetEmbeddingCircuit();
    jest.useRealTimers();
  });

  afterEach(() => {
    resetEmbeddingCircuit();
    jest.useRealTimers();
  });

  it('starts closed', () => {
    expect(isEmbeddingCircuitOpen()).toBe(false);
    expect(embeddingCircuitRemainingMs()).toBe(0);
  });

  it('stays closed for a single failure', () => {
    // One timeout is a blip. Opening on it would disable semantic search for a
    // transient hiccup.
    recordEmbeddingFailure();

    expect(isEmbeddingCircuitOpen()).toBe(false);
  });

  it('stays closed below the threshold', () => {
    for (let i = 0; i < EMBEDDING_CIRCUIT_FAILURE_THRESHOLD - 1; i += 1) {
      recordEmbeddingFailure();
    }

    expect(isEmbeddingCircuitOpen()).toBe(false);
  });

  it('opens at the threshold', () => {
    for (let i = 0; i < EMBEDDING_CIRCUIT_FAILURE_THRESHOLD; i += 1) {
      recordEmbeddingFailure();
    }

    expect(isEmbeddingCircuitOpen()).toBe(true);
    expect(embeddingCircuitRemainingMs()).toBeGreaterThan(0);
    expect(embeddingCircuitRemainingMs()).toBeLessThanOrEqual(EMBEDDING_CIRCUIT_OPEN_MS);
  });

  it('a success anywhere below the threshold resets the count', () => {
    recordEmbeddingFailure();
    recordEmbeddingFailure();
    recordEmbeddingSuccess();
    recordEmbeddingFailure();
    recordEmbeddingFailure();

    // Four failures total, but never three in a ROW.
    expect(isEmbeddingCircuitOpen()).toBe(false);
  });

  it('closes on the next success after opening', () => {
    for (let i = 0; i < EMBEDDING_CIRCUIT_FAILURE_THRESHOLD; i += 1) {
      recordEmbeddingFailure();
    }
    expect(isEmbeddingCircuitOpen()).toBe(true);

    recordEmbeddingSuccess();

    expect(isEmbeddingCircuitOpen()).toBe(false);
    expect(embeddingCircuitRemainingMs()).toBe(0);
  });

  it('closes on its own once the open window elapses', () => {
    for (let i = 0; i < EMBEDDING_CIRCUIT_FAILURE_THRESHOLD; i += 1) {
      recordEmbeddingFailure();
    }
    expect(isEmbeddingCircuitOpen()).toBe(true);

    // Self-healing matters: an operator who installs the embedding model must
    // not have to restart the service to get semantic search back.
    jest.useFakeTimers();
    jest.setSystemTime(Date.now() + EMBEDDING_CIRCUIT_OPEN_MS + 1);

    expect(isEmbeddingCircuitOpen()).toBe(false);
  });
});
