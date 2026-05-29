import { estimateCostUsd } from '../utilities/cost-estimator.utility';
import { estimateTokensFromText } from '../utilities/token-estimator.utility';

describe('estimateCostUsd', () => {
  it('reports local providers as free and available', () => {
    const r = estimateCostUsd('local-ollama', 'gemma3:4b', 1000, 1000);
    expect(r.available).toBe(true);
    expect(r.costUsd).toBe(0);
  });

  it('computes cost for a known cloud model', () => {
    const r = estimateCostUsd('gemini', 'gemini-2.5-flash', 1_000_000, 1_000_000);
    expect(r.available).toBe(true);
    // 0.30 input + 2.50 output per 1M
    expect(r.costUsd).toBeCloseTo(2.8, 5);
  });

  it('matches the longest pricing key (gpt-4o-mini over gpt-4o)', () => {
    const r = estimateCostUsd('openai', 'gpt-4o-mini', 1_000_000, 0);
    expect(r.costUsd).toBeCloseTo(0.15, 5);
  });

  it('returns unavailable for an unknown model (never $0)', () => {
    const r = estimateCostUsd('mystery', 'totally-unknown-model', 1000, 1000);
    expect(r.available).toBe(false);
    expect(r.costUsd).toBeUndefined();
  });
});

describe('estimateTokensFromText', () => {
  it('returns 0 for empty text', () => {
    expect(estimateTokensFromText('')).toBe(0);
  });

  it('approximates ~4 chars per token', () => {
    expect(estimateTokensFromText('abcd')).toBe(1);
    expect(estimateTokensFromText('a'.repeat(40))).toBe(10);
  });
});
