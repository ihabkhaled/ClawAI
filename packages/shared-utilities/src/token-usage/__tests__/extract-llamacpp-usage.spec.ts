import { TokenEstimatorKind, TokenUsageSource } from '@claw/shared-types';

import { extractLlamacppUsage } from '../extract-llamacpp-usage.utility';

describe('extractLlamacppUsage', () => {
  it('reads OpenAI-compatible usage (prompt_tokens / completion_tokens)', () => {
    const usage = extractLlamacppUsage({
      usage: { prompt_tokens: 70, completion_tokens: 30, total_tokens: 100 },
    });
    expect(usage).toEqual({
      promptTokens: 70,
      completionTokens: 30,
      totalTokens: 100,
      estimated: false,
      source: TokenUsageSource.NATIVE,
      estimator: TokenEstimatorKind.NONE,
    });
  });

  it('reads native completion-endpoint runtime fields (tokens_evaluated / tokens_predicted)', () => {
    const usage = extractLlamacppUsage({
      tokens_evaluated: 18,
      tokens_predicted: 6,
      content: '...',
    });
    expect(usage.promptTokens).toBe(18);
    expect(usage.completionTokens).toBe(6);
    expect(usage.source).toBe(TokenUsageSource.NATIVE);
  });

  it('prefers the OpenAI-compatible usage block over runtime fields', () => {
    const usage = extractLlamacppUsage({
      usage: { prompt_tokens: 5, completion_tokens: 7 },
      tokens_evaluated: 999,
      tokens_predicted: 999,
    });
    expect(usage.promptTokens).toBe(5);
    expect(usage.completionTokens).toBe(7);
  });

  it('estimates from text when no usage is present', () => {
    const usage = extractLlamacppUsage(
      { content: 'ok' },
      { promptText: 'hello world', completionText: 'hi there' },
    );
    expect(usage.estimated).toBe(true);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
    expect(usage.estimator).toBe(TokenEstimatorKind.CHAR_DIV_4);
    expect(usage.promptTokens).toBe(3);
    expect(usage.completionTokens).toBe(2);
  });

  it('handles empty text fallbacks as zero estimates', () => {
    const usage = extractLlamacppUsage({}, { promptText: '', completionText: '' });
    expect(usage.totalTokens).toBe(0);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
  });

  it('estimates Arabic completion text', () => {
    const arabic = 'مرحبا بك في كلاو';
    const usage = extractLlamacppUsage({}, { completionText: arabic });
    expect(usage.completionTokens).toBe(Math.ceil(arabic.length / 4));
  });

  it('estimates a code-block completion', () => {
    const code = '```c\nint main() { return 0; }\n```';
    const usage = extractLlamacppUsage({}, { completionText: code });
    expect(usage.completionTokens).toBe(Math.ceil(code.length / 4));
  });

  it('estimates very long text', () => {
    const long = 'q'.repeat(24_000);
    const usage = extractLlamacppUsage({}, { promptText: long });
    expect(usage.promptTokens).toBe(6000);
  });

  it('does not throw and estimates for undefined / malformed responses', () => {
    expect(() => extractLlamacppUsage(undefined)).not.toThrow();
    expect(() => extractLlamacppUsage('garbage')).not.toThrow();
    expect(() => extractLlamacppUsage({ usage: true })).not.toThrow();
    const usage = extractLlamacppUsage(undefined, { promptText: 'abcd' });
    expect(usage.promptTokens).toBe(1);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
  });
});
