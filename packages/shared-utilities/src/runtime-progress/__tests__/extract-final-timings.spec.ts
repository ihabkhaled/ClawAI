import { RuntimeProgressConfidence } from '@claw/shared-types';

import { extractOllamaFinalTimings } from '../extract-final-timings.utility';

describe('extractOllamaFinalTimings', () => {
  it('converts nanosecond durations to milliseconds and reports RUNTIME_REPORTED confidence', () => {
    const result = extractOllamaFinalTimings({
      totalDurationNs: 3_000_000_000,
      loadDurationNs: 500_000_000,
      promptEvalCount: 12,
      promptEvalDurationNs: 200_000_000,
      evalCount: 40,
      evalDurationNs: 2_200_000_000,
    });
    expect(result.elapsedMs).toBe(3000);
    expect(result.modelLoadMs).toBe(500);
    expect(result.promptEvalMs).toBe(200);
    expect(result.generationMs).toBe(2200);
    expect(result.progressConfidence).toBe(RuntimeProgressConfidence.RUNTIME_REPORTED);
  });

  it('derives a usable bottleneck signal when paired with findBottleneck (generation slowest)', () => {
    const partial = extractOllamaFinalTimings({
      loadDurationNs: 500_000_000,
      promptEvalDurationNs: 200_000_000,
      evalDurationNs: 2_200_000_000,
      evalCount: 40,
    });
    // Caller can feed the converted ms fields into findBottleneck-shaped input.
    expect(partial.modelLoadMs).toBe(500);
    expect(partial.promptEvalMs).toBe(200);
    expect(partial.generationMs).toBe(2200);
    // Verify the slowest stage is generation by manual comparison.
    const slowest = Math.max(
      partial.modelLoadMs ?? 0,
      partial.promptEvalMs ?? 0,
      partial.generationMs ?? 0,
    );
    expect(slowest).toBe(partial.generationMs);
  });

  it('computes tokensPerSecond when evalCount + evalDuration are present', () => {
    const result = extractOllamaFinalTimings({
      evalCount: 100,
      evalDurationNs: 2_000_000_000,
    });
    expect(result.tokensPerSecond).toBeCloseTo(50, 4);
  });

  it('returns undefined tokensPerSecond when evalDuration is 0 (cached completion)', () => {
    const result = extractOllamaFinalTimings({
      evalCount: 25,
      evalDurationNs: 0,
    });
    expect(result.tokensPerSecond).toBeUndefined();
  });

  it('sums promptTokens + outputTokens into totalTokens when both are present', () => {
    const result = extractOllamaFinalTimings({
      promptEvalCount: 10,
      evalCount: 25,
    });
    expect(result.totalTokens).toBe(35);
  });
});
