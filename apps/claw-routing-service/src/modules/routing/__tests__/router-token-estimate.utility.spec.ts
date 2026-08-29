import { ROUTER_PROMPT_CHARS_PER_TOKEN } from '../constants/router-adapter.constants';
import { estimateRouterPromptTokens } from '../utilities/router-token-estimate.utility';

describe('estimateRouterPromptTokens', () => {
  it('returns zero for an empty prompt', () => {
    expect(estimateRouterPromptTokens('')).toBe(0);
  });

  it('returns an integer for every input', () => {
    for (const prompt of ['a', 'ab', 'abc', 'abcd', 'x'.repeat(1_001)]) {
      expect(Number.isInteger(estimateRouterPromptTokens(prompt))).toBe(true);
    }
  });

  it('never returns zero for a non-empty prompt', () => {
    expect(estimateRouterPromptTokens('a')).toBeGreaterThan(0);
  });

  // The direction that matters. A reservation is reconciled against the
  // provider's own prompt_tokens on finalize, so over-estimating costs the user
  // nothing, while under-estimating lets a request start that the balance
  // cannot pay for. Real English is nearer 4 characters per token.
  it('over-estimates against the realistic 4-characters-per-token ratio', () => {
    const prompt = 'route this message to a suitable deployment'.repeat(20);

    expect(estimateRouterPromptTokens(prompt)).toBeGreaterThan(prompt.length / 4);
  });

  it('scales linearly with prompt length', () => {
    const single = estimateRouterPromptTokens('x'.repeat(ROUTER_PROMPT_CHARS_PER_TOKEN * 100));
    const double = estimateRouterPromptTokens('x'.repeat(ROUTER_PROMPT_CHARS_PER_TOKEN * 200));

    expect(single).toBe(100);
    expect(double).toBe(200);
  });
});
