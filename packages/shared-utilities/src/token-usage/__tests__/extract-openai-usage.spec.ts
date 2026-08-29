import { TokenEstimatorKind, TokenUsageSource } from '@claw/shared-types';

import { extractOpenAiCompatibleUsage } from '../extract-openai-usage.utility';

describe('extractOpenAiCompatibleUsage', () => {
  it('reads native usage from an OpenAI-compatible response', () => {
    const usage = extractOpenAiCompatibleUsage({
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    });
    expect(usage).toEqual({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      cachedPromptTokens: 0,
      reasoningTokens: 0,
      estimated: false,
      source: TokenUsageSource.NATIVE,
      estimator: TokenEstimatorKind.NONE,
    });
  });

  it('estimates from text when usage block is missing', () => {
    const usage = extractOpenAiCompatibleUsage(
      { choices: [{ message: { content: 'hi' } }] },
      { promptText: 'hello world', completionText: 'hi there' },
    );
    expect(usage.estimated).toBe(true);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
    expect(usage.estimator).toBe(TokenEstimatorKind.CHAR_DIV_4);
    expect(usage.promptTokens).toBe(3);
    expect(usage.completionTokens).toBe(2);
  });

  it('handles empty text fallbacks as zero estimates', () => {
    const usage = extractOpenAiCompatibleUsage({}, { promptText: '', completionText: '' });
    expect(usage.promptTokens).toBe(0);
    expect(usage.completionTokens).toBe(0);
    expect(usage.totalTokens).toBe(0);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
  });

  it('estimates Arabic completion text', () => {
    const arabic = 'مرحبا بك في كلاو';
    const usage = extractOpenAiCompatibleUsage({}, { completionText: arabic });
    expect(usage.completionTokens).toBe(Math.ceil(arabic.length / 4));
    expect(usage.estimated).toBe(true);
  });

  it('estimates a code-block completion', () => {
    const code = '```ts\nconst x: number = 1;\nconsole.log(x);\n```';
    const usage = extractOpenAiCompatibleUsage({}, { completionText: code });
    expect(usage.completionTokens).toBe(Math.ceil(code.length / 4));
    expect(usage.estimated).toBe(true);
  });

  it('estimates very long text', () => {
    const long = 'token '.repeat(5000); // length 30000
    const usage = extractOpenAiCompatibleUsage({}, { promptText: long });
    expect(usage.promptTokens).toBe(Math.ceil(long.length / 4));
  });

  it('does not throw and estimates for an undefined response', () => {
    expect(() => extractOpenAiCompatibleUsage(undefined)).not.toThrow();
    const usage = extractOpenAiCompatibleUsage(undefined, { promptText: 'abcd' });
    expect(usage.promptTokens).toBe(1);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
  });

  it('does not throw for malformed (non-object / array / string) responses', () => {
    expect(() => extractOpenAiCompatibleUsage('garbage')).not.toThrow();
    expect(() => extractOpenAiCompatibleUsage(42)).not.toThrow();
    expect(() => extractOpenAiCompatibleUsage([1, 2, 3])).not.toThrow();
    expect(() => extractOpenAiCompatibleUsage({ usage: 'not-an-object' })).not.toThrow();
    const usage = extractOpenAiCompatibleUsage({ usage: null });
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
    expect(usage.totalTokens).toBe(0);
  });
});
