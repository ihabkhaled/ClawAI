import { computeFinalStreamMetrics } from '../utilities/final-metrics.utility';

describe('computeFinalStreamMetrics', () => {
  it('converts Ollama nanosecond timings to ms + tokens/sec + bottleneck', () => {
    const result = computeFinalStreamMetrics({
      totalDurationNs: 3_000_000_000,
      loadDurationNs: 500_000_000,
      promptEvalCount: 12,
      promptEvalDurationNs: 200_000_000,
      evalCount: 40,
      evalDurationNs: 2_200_000_000,
      doneReason: 'stop',
    });

    expect(result.modelLoadMs).toBe(500);
    expect(result.promptEvalMs).toBe(200);
    expect(result.generationMs).toBe(2200);
    expect(result.totalMs).toBe(3000);
    expect(result.promptTokens).toBe(12);
    expect(result.outputTokens).toBe(40);
    expect(result.totalTokens).toBe(52);
    expect(result.tokensPerSecond).toBeCloseTo(40 / 2.2, 4);
    expect(result.bottleneck).toEqual({
      stage: 'generation',
      durationMs: 2200,
      percentOfTotal: 2200 / (500 + 200 + 2200),
    });
  });

  it('selects modelLoad as the bottleneck when it dwarfs prompt + generation', () => {
    const result = computeFinalStreamMetrics({
      totalDurationNs: 11_000_000_000,
      loadDurationNs: 10_000_000_000,
      promptEvalCount: 5,
      promptEvalDurationNs: 100_000_000,
      evalCount: 10,
      evalDurationNs: 900_000_000,
    });

    expect(result.bottleneck?.stage).toBe('modelLoad');
    expect(result.bottleneck?.durationMs).toBe(10_000);
    expect(result.bottleneck?.percentOfTotal).toBeCloseTo(10_000 / 11_000, 4);
  });

  it('returns no bottleneck when all stage durations are zero or missing', () => {
    const result = computeFinalStreamMetrics({
      totalDurationNs: 0,
      loadDurationNs: 0,
      promptEvalDurationNs: 0,
      evalDurationNs: 0,
    });
    expect(result.bottleneck).toBeUndefined();
  });

  it('still reports counts when only token counts are present (no duration breakdown)', () => {
    const result = computeFinalStreamMetrics({
      promptEvalCount: 7,
      evalCount: 13,
    });
    expect(result.promptTokens).toBe(7);
    expect(result.outputTokens).toBe(13);
    expect(result.totalTokens).toBe(20);
    expect(result.bottleneck).toBeUndefined();
    expect(result.tokensPerSecond).toBeUndefined();
  });
});
