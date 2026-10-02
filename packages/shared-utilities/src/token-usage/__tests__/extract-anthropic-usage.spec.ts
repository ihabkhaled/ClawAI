import { TokenEstimatorKind, TokenUsageSource } from '@claw/shared-types';

import { extractAnthropicUsage } from '../extract-anthropic-usage.utility';

describe('extractAnthropicUsage', () => {
  it('reads native usage (input_tokens / output_tokens)', () => {
    const usage = extractAnthropicUsage({
      usage: { input_tokens: 200, output_tokens: 80 },
    });
    expect(usage).toEqual({
      promptTokens: 200,
      completionTokens: 80,
      totalTokens: 280,
      cachedPromptTokens: 0,
      reasoningTokens: 0,
      estimated: false,
      source: TokenUsageSource.NATIVE,
      estimator: TokenEstimatorKind.NONE,
    });
  });

  it('estimates from text when usage block is missing', () => {
    const usage = extractAnthropicUsage(
      { content: [{ type: 'text', text: 'ok' }] },
      { promptText: 'hello world', completionText: 'hi there' },
    );
    expect(usage.estimated).toBe(true);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
    expect(usage.promptTokens).toBe(3);
    expect(usage.completionTokens).toBe(2);
  });

  it('handles empty text fallbacks as zero estimates', () => {
    const usage = extractAnthropicUsage({}, { promptText: '', completionText: '' });
    expect(usage.totalTokens).toBe(0);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
  });

  it('estimates Arabic completion text', () => {
    const arabic = 'مرحبا بك في كلاو';
    const usage = extractAnthropicUsage({}, { completionText: arabic });
    expect(usage.completionTokens).toBe(Math.ceil(arabic.length / 4));
    expect(usage.estimated).toBe(true);
  });

  it('estimates a code-block completion', () => {
    const code = '```py\ndef add(a, b):\n    return a + b\n```';
    const usage = extractAnthropicUsage({}, { completionText: code });
    expect(usage.completionTokens).toBe(Math.ceil(code.length / 4));
  });

  it('estimates very long text', () => {
    const long = 'word '.repeat(8000);
    const usage = extractAnthropicUsage({}, { completionText: long });
    expect(usage.completionTokens).toBe(Math.ceil(long.length / 4));
  });

  it('does not throw and estimates for undefined / malformed responses', () => {
    expect(() => extractAnthropicUsage(undefined)).not.toThrow();
    expect(() => extractAnthropicUsage('garbage')).not.toThrow();
    expect(() => extractAnthropicUsage({ usage: [] })).not.toThrow();
    const usage = extractAnthropicUsage(undefined, { promptText: 'abcd' });
    expect(usage.promptTokens).toBe(1);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
  });
});

describe('extractAnthropicUsage: cache fields (F093)', () => {
  it('reassembles the prompt and reports the write separately from the read', () => {
    const usage = extractAnthropicUsage({
      usage: {
        input_tokens: 40,
        cache_creation_input_tokens: 1200,
        cache_read_input_tokens: 6800,
        output_tokens: 90,
      },
    });
    expect(usage.promptTokens).toBe(8040);
    expect(usage.cachedPromptTokens).toBe(6800);
    expect(usage.cacheCreationPromptTokens).toBe(1200);
    expect(usage.completionTokens).toBe(90);
  });

  it('leaves the write out when the payload has none, so older shapes are unchanged', () => {
    const usage = extractAnthropicUsage({ usage: { input_tokens: 10, output_tokens: 2 } });
    expect(usage).not.toHaveProperty('cacheCreationPromptTokens');
    expect(usage.promptTokens).toBe(10);
  });
});
