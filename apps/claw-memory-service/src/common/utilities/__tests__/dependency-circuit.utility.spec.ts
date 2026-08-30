import {
  CIRCUIT_OLLAMA_EMBEDDINGS,
  CIRCUIT_OLLAMA_GENERATE,
  DEPENDENCY_CIRCUIT_FAILURE_THRESHOLD,
  DEPENDENCY_CIRCUIT_OPEN_MS,
} from '../../constants';
import {
  circuitRemainingMs,
  isCircuitOpen,
  recordCircuitFailure,
  recordCircuitSuccess,
  resetCircuits,
  throughCircuit,
} from '../dependency-circuit.utility';

/**
 * Measured on a running stack with no Ollama models installed:
 *
 *   embeddings  ~4s failure, once per retrieval
 *   generation ~10s failure, once per message (extraction) and per memory
 *              (sensitivity)
 *
 * At sixteen concurrent generations the ten-second calls starved memory
 * retrieval into its own five-second timeout — a dead optional feature taking
 * down a working one.
 */
describe('dependency circuit', () => {
  beforeEach(() => {
    resetCircuits();
    jest.useRealTimers();
  });

  afterEach(() => {
    resetCircuits();
    jest.useRealTimers();
  });

  const openIt = (key: string): void => {
    for (let i = 0; i < DEPENDENCY_CIRCUIT_FAILURE_THRESHOLD; i += 1) recordCircuitFailure(key);
  };

  it('starts closed for an unknown key', () => {
    expect(isCircuitOpen('never-seen')).toBe(false);
    expect(circuitRemainingMs('never-seen')).toBe(0);
  });

  it('stays closed below the threshold', () => {
    for (let i = 0; i < DEPENDENCY_CIRCUIT_FAILURE_THRESHOLD - 1; i += 1) {
      recordCircuitFailure(CIRCUIT_OLLAMA_GENERATE);
    }

    expect(isCircuitOpen(CIRCUIT_OLLAMA_GENERATE)).toBe(false);
  });

  it('opens at the threshold', () => {
    openIt(CIRCUIT_OLLAMA_GENERATE);

    expect(isCircuitOpen(CIRCUIT_OLLAMA_GENERATE)).toBe(true);
    expect(circuitRemainingMs(CIRCUIT_OLLAMA_GENERATE)).toBeLessThanOrEqual(
      DEPENDENCY_CIRCUIT_OPEN_MS,
    );
  });

  it('keys are independent — a dead generator does not disable embeddings', () => {
    // The reason this is keyed at all. Embeddings and generation are different
    // endpoints that fail independently; one shared breaker would disable
    // working semantic search because extraction was down.
    openIt(CIRCUIT_OLLAMA_GENERATE);

    expect(isCircuitOpen(CIRCUIT_OLLAMA_GENERATE)).toBe(true);
    expect(isCircuitOpen(CIRCUIT_OLLAMA_EMBEDDINGS)).toBe(false);
  });

  it('a success below the threshold resets the count', () => {
    recordCircuitFailure(CIRCUIT_OLLAMA_GENERATE);
    recordCircuitFailure(CIRCUIT_OLLAMA_GENERATE);
    recordCircuitSuccess(CIRCUIT_OLLAMA_GENERATE);
    recordCircuitFailure(CIRCUIT_OLLAMA_GENERATE);
    recordCircuitFailure(CIRCUIT_OLLAMA_GENERATE);

    // Four failures, never three in a ROW.
    expect(isCircuitOpen(CIRCUIT_OLLAMA_GENERATE)).toBe(false);
  });

  it('closes on its own once the window elapses', () => {
    openIt(CIRCUIT_OLLAMA_GENERATE);
    jest.useFakeTimers();
    jest.setSystemTime(Date.now() + DEPENDENCY_CIRCUIT_OPEN_MS + 1);

    // Self-healing matters: installing the model must not require a restart.
    expect(isCircuitOpen(CIRCUIT_OLLAMA_GENERATE)).toBe(false);
  });

  describe('throughCircuit', () => {
    it('returns the call result and closes a previously failing circuit', async () => {
      recordCircuitFailure(CIRCUIT_OLLAMA_GENERATE);

      await expect(throughCircuit(CIRCUIT_OLLAMA_GENERATE, async () => 'ok')).resolves.toBe('ok');
      expect(isCircuitOpen(CIRCUIT_OLLAMA_GENERATE)).toBe(false);
    });

    it('opens after the threshold of failing calls', async () => {
      const boom = async (): Promise<never> => {
        throw new Error('backend down');
      };
      for (let i = 0; i < DEPENDENCY_CIRCUIT_FAILURE_THRESHOLD; i += 1) {
        await expect(throughCircuit(CIRCUIT_OLLAMA_GENERATE, boom)).rejects.toThrow('backend down');
      }

      expect(isCircuitOpen(CIRCUIT_OLLAMA_GENERATE)).toBe(true);
    });

    it('admits only ONE trial call once the open window elapses', async () => {
      // The burst is the thing. A breaker that throttles how OFTEN a dead
      // dependency is hammered, but still admits sixteen simultaneous calls the
      // moment its window expires, does not prevent the starvation it exists to
      // prevent — measured at sixteen concurrent generations.
      const boom = async (): Promise<never> => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        throw new Error('still down');
      };
      for (let i = 0; i < DEPENDENCY_CIRCUIT_FAILURE_THRESHOLD; i += 1) {
        await expect(throughCircuit(CIRCUIT_OLLAMA_GENERATE, boom)).rejects.toThrow('still down');
      }
      expect(isCircuitOpen(CIRCUIT_OLLAMA_GENERATE)).toBe(true);

      // Move past the open window without closing the circuit.
      jest.useFakeTimers({ doNotFake: ['setTimeout'] });
      jest.setSystemTime(Date.now() + DEPENDENCY_CIRCUIT_OPEN_MS + 1);
      expect(isCircuitOpen(CIRCUIT_OLLAMA_GENERATE)).toBe(false);

      let invocations = 0;
      const counted = async (): Promise<never> => {
        invocations += 1;
        return boom();
      };
      const outcomes = await Promise.allSettled(
        Array.from({ length: 8 }, async () => throughCircuit(CIRCUIT_OLLAMA_GENERATE, counted)),
      );

      expect(invocations).toBe(1);
      expect(outcomes.every((o) => o.status === 'rejected')).toBe(true);
    });

    it('does not invoke the call at all while open', async () => {
      openIt(CIRCUIT_OLLAMA_GENERATE);
      let invoked = false;
      const call = async (): Promise<string> => {
        invoked = true;
        return 'unreachable';
      };

      // The whole point: the ten seconds are never spent.
      await expect(throughCircuit(CIRCUIT_OLLAMA_GENERATE, call)).rejects.toThrow('circuit open');
      expect(invoked).toBe(false);
    });
  });
});
