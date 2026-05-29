import { TokenEstimatorKind, TokenUsageSource } from '@claw/shared-types';

import { normalizeTokenUsage } from '../normalize-token-usage.utility';

describe('normalizeTokenUsage', () => {
  it('returns NATIVE source when both counts are present', () => {
    const usage = normalizeTokenUsage({ promptTokens: 10, completionTokens: 20 });
    expect(usage).toEqual({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      estimated: false,
      source: TokenUsageSource.NATIVE,
      estimator: TokenEstimatorKind.NONE,
    });
  });

  it('treats a zero native count as present (not missing)', () => {
    const usage = normalizeTokenUsage({ promptTokens: 0, completionTokens: 0 });
    expect(usage.source).toBe(TokenUsageSource.NATIVE);
    expect(usage.estimated).toBe(false);
    expect(usage.totalTokens).toBe(0);
  });

  it('estimates both sides when both counts are missing', () => {
    const usage = normalizeTokenUsage({
      promptText: 'hello world', // ceil(11/4) = 3
      completionText: 'hi there', // ceil(8/4) = 2
    });
    expect(usage.promptTokens).toBe(3);
    expect(usage.completionTokens).toBe(2);
    expect(usage.totalTokens).toBe(5);
    expect(usage.estimated).toBe(true);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
    expect(usage.estimator).toBe(TokenEstimatorKind.CHAR_DIV_4);
  });

  it('returns MIXED when prompt is native and completion is estimated', () => {
    const usage = normalizeTokenUsage({
      promptTokens: 12,
      completionText: 'abcd', // ceil(4/4) = 1
    });
    expect(usage.promptTokens).toBe(12);
    expect(usage.completionTokens).toBe(1);
    expect(usage.totalTokens).toBe(13);
    expect(usage.estimated).toBe(true);
    expect(usage.source).toBe(TokenUsageSource.MIXED);
    expect(usage.estimator).toBe(TokenEstimatorKind.CHAR_DIV_4);
  });

  it('returns MIXED when completion is native and prompt is estimated', () => {
    const usage = normalizeTokenUsage({
      completionTokens: 7,
      promptText: 'abcdefgh', // ceil(8/4) = 2
    });
    expect(usage.promptTokens).toBe(2);
    expect(usage.completionTokens).toBe(7);
    expect(usage.source).toBe(TokenUsageSource.MIXED);
    expect(usage.estimated).toBe(true);
  });

  it('estimates to 0 when a side is missing and no text is supplied', () => {
    const usage = normalizeTokenUsage({ promptTokens: 5 });
    expect(usage.promptTokens).toBe(5);
    expect(usage.completionTokens).toBe(0);
    expect(usage.totalTokens).toBe(5);
    expect(usage.source).toBe(TokenUsageSource.MIXED);
  });

  it('returns all-zero ESTIMATED usage for a completely empty input', () => {
    const usage = normalizeTokenUsage({});
    expect(usage.promptTokens).toBe(0);
    expect(usage.completionTokens).toBe(0);
    expect(usage.totalTokens).toBe(0);
    expect(usage.estimated).toBe(true);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
    expect(usage.estimator).toBe(TokenEstimatorKind.CHAR_DIV_4);
  });

  it('ignores a provided totalTokens and keeps prompt+completion invariant', () => {
    const usage = normalizeTokenUsage({
      promptTokens: 4,
      completionTokens: 6,
      totalTokens: 999,
    });
    expect(usage.totalTokens).toBe(10);
  });

  it('treats negative / non-finite native counts as missing and estimates', () => {
    const usage = normalizeTokenUsage({
      promptTokens: -5,
      completionTokens: Number.NaN,
      promptText: 'abcd', // 1
      completionText: 'abcdefgh', // 2
    });
    expect(usage.promptTokens).toBe(1);
    expect(usage.completionTokens).toBe(2);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
  });

  it('floors fractional native counts', () => {
    const usage = normalizeTokenUsage({ promptTokens: 10.9, completionTokens: 4.2 });
    expect(usage.promptTokens).toBe(10);
    expect(usage.completionTokens).toBe(4);
    expect(usage.source).toBe(TokenUsageSource.NATIVE);
  });
});
