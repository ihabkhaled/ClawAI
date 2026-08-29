import { TokenEstimatorKind, TokenUsageSource } from '@claw/shared-types';

import { extractGeminiUsage } from '../extract-gemini-usage.utility';

describe('extractGeminiUsage', () => {
  it('reads native usage from usageMetadata', () => {
    const usage = extractGeminiUsage({
      usageMetadata: {
        promptTokenCount: 40,
        candidatesTokenCount: 12,
        totalTokenCount: 52,
      },
    });
    expect(usage).toEqual({
      promptTokens: 40,
      completionTokens: 12,
      totalTokens: 52,
      cachedPromptTokens: 0,
      reasoningTokens: 0,
      estimated: false,
      source: TokenUsageSource.NATIVE,
      estimator: TokenEstimatorKind.NONE,
    });
  });

  it('estimates from text when usageMetadata is missing', () => {
    const usage = extractGeminiUsage(
      { candidates: [{ content: { parts: [{ text: 'ok' }] } }] },
      { promptText: 'hello world', completionText: 'hi there' },
    );
    expect(usage.estimated).toBe(true);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
    expect(usage.promptTokens).toBe(3);
    expect(usage.completionTokens).toBe(2);
  });

  it('handles empty text fallbacks as zero estimates', () => {
    const usage = extractGeminiUsage({}, { promptText: '', completionText: '' });
    expect(usage.totalTokens).toBe(0);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
  });

  it('estimates Arabic prompt text', () => {
    const arabic = 'مرحبا بك في كلاو';
    const usage = extractGeminiUsage({}, { promptText: arabic });
    expect(usage.promptTokens).toBe(Math.ceil(arabic.length / 4));
    expect(usage.estimated).toBe(true);
  });

  it('estimates a code-block completion', () => {
    const code = '```js\nfunction f() { return 42; }\n```';
    const usage = extractGeminiUsage({}, { completionText: code });
    expect(usage.completionTokens).toBe(Math.ceil(code.length / 4));
  });

  it('estimates very long text', () => {
    const long = 'x'.repeat(40_000);
    const usage = extractGeminiUsage({}, { promptText: long });
    expect(usage.promptTokens).toBe(10_000);
  });

  it('returns MIXED when only prompt count is present', () => {
    const usage = extractGeminiUsage(
      { usageMetadata: { promptTokenCount: 30 } },
      { completionText: 'abcd' },
    );
    expect(usage.promptTokens).toBe(30);
    expect(usage.completionTokens).toBe(1);
    expect(usage.source).toBe(TokenUsageSource.MIXED);
  });

  it('does not throw and estimates for undefined / malformed responses', () => {
    expect(() => extractGeminiUsage(undefined)).not.toThrow();
    expect(() => extractGeminiUsage('garbage')).not.toThrow();
    expect(() => extractGeminiUsage({ usageMetadata: 7 })).not.toThrow();
    const usage = extractGeminiUsage(undefined, { promptText: 'abcd' });
    expect(usage.promptTokens).toBe(1);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
  });
});
