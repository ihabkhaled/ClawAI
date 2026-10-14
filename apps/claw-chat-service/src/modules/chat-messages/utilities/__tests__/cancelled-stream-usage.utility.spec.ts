import { estimateCancelledStreamUsage } from '../cancelled-stream-usage.utility';

describe('estimateCancelledStreamUsage', () => {
  it('bills 1 output token per 4 streamed characters, rounded up', () => {
    const usage = estimateCancelledStreamUsage({
      streamedChars: 401,
      promptText: 'x'.repeat(40),
      outputCeilingTokens: 10_000,
    });

    expect(usage).toEqual({ promptTokens: 10, completionTokens: 101 });
  });

  it('never bills more than the hold ceiling', () => {
    const usage = estimateCancelledStreamUsage({
      streamedChars: 40_000,
      promptText: 'abcd',
      outputCeilingTokens: 500,
    });

    expect(usage.completionTokens).toBe(500);
  });

  it('bills nothing for output when nothing streamed', () => {
    expect(
      estimateCancelledStreamUsage({ streamedChars: 0, promptText: '', outputCeilingTokens: 100 }),
    ).toEqual({ promptTokens: 0, completionTokens: 0 });
  });
});
