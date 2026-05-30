import { RuntimeProgressConfidence } from '@claw/shared-types';

import { extractOllamaFinalTimings } from '../../src/runtime-progress/extract-final-timings.utility';

describe('extractOllamaFinalTimings', () => {
  it('converts a full Ollama final block to ms and computes tokensPerSecond', () => {
    const result = extractOllamaFinalTimings({
      totalDurationNs: 5_000_000_000,
      loadDurationNs: 1_000_000_000,
      promptEvalCount: 12,
      promptEvalDurationNs: 500_000_000,
      evalCount: 100,
      evalDurationNs: 2_000_000_000,
    });
    expect(result.elapsedMs).toBe(5_000);
    expect(result.modelLoadMs).toBe(1_000);
    expect(result.promptEvalMs).toBe(500);
    expect(result.generationMs).toBe(2_000);
    expect(result.promptTokens).toBe(12);
    expect(result.outputTokens).toBe(100);
    expect(result.totalTokens).toBe(112);
    expect(result.tokensPerSecond).toBeCloseTo(50, 5);
    expect(result.progressConfidence).toBe(RuntimeProgressConfidence.RUNTIME_REPORTED);
  });

  it('leaves tokensPerSecond undefined when evalCount is missing', () => {
    const result = extractOllamaFinalTimings({
      totalDurationNs: 2_000_000_000,
      evalDurationNs: 1_000_000_000,
    });
    expect(result.tokensPerSecond).toBeUndefined();
    expect(result.outputTokens).toBeUndefined();
    expect(result.elapsedMs).toBe(2_000);
    expect(result.generationMs).toBe(1_000);
  });

  it('still computes generation timing without a prompt_eval section', () => {
    const result = extractOllamaFinalTimings({
      evalCount: 25,
      evalDurationNs: 500_000_000,
    });
    expect(result.promptEvalMs).toBeUndefined();
    expect(result.generationMs).toBe(500);
    expect(result.tokensPerSecond).toBeCloseTo(50, 5);
    expect(result.outputTokens).toBe(25);
    expect(result.totalTokens).toBe(25);
  });

  it('converts elapsedMs correctly from nanoseconds', () => {
    const result = extractOllamaFinalTimings({ totalDurationNs: 123_456_789 });
    expect(result.elapsedMs).toBeCloseTo(123.456789, 6);
  });

  it('guards against division by zero on a zero-duration generation', () => {
    const result = extractOllamaFinalTimings({
      evalCount: 10,
      evalDurationNs: 0,
    });
    expect(result.tokensPerSecond).toBeUndefined();
    expect(Number.isFinite(result.tokensPerSecond ?? 1)).toBe(true);
    expect(result.outputTokens).toBe(10);
  });

  it('preserves numeric precision for tokensPerSecond', () => {
    const result = extractOllamaFinalTimings({
      evalCount: 7,
      evalDurationNs: 1_000_000_000,
    });
    expect(result.tokensPerSecond).toBeCloseTo(7, 9);
  });

  it('returns only progressConfidence when input is empty', () => {
    const result = extractOllamaFinalTimings({});
    expect(result).toEqual({
      progressConfidence: RuntimeProgressConfidence.RUNTIME_REPORTED,
    });
  });

  it('ignores negative nanosecond durations', () => {
    const result = extractOllamaFinalTimings({
      totalDurationNs: -5,
      evalDurationNs: -1,
      evalCount: 10,
    });
    expect(result.elapsedMs).toBeUndefined();
    expect(result.generationMs).toBeUndefined();
    expect(result.tokensPerSecond).toBeUndefined();
  });
});
