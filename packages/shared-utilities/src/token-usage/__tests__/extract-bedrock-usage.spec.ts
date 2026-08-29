import { TokenEstimatorKind, TokenUsageSource } from '@claw/shared-types';

import { extractBedrockUsage } from '../extract-bedrock-usage.utility';

describe('extractBedrockUsage', () => {
  it('reads native Converse-style usage (inputTokens / outputTokens)', () => {
    const usage = extractBedrockUsage({
      usage: { inputTokens: 300, outputTokens: 90 },
    });
    expect(usage).toEqual({
      promptTokens: 300,
      completionTokens: 90,
      totalTokens: 390,
      cachedPromptTokens: 0,
      reasoningTokens: 0,
      estimated: false,
      source: TokenUsageSource.NATIVE,
      estimator: TokenEstimatorKind.NONE,
    });
  });

  it('reads native invocation-metrics usage as a secondary source', () => {
    const usage = extractBedrockUsage({
      'amazon-bedrock-invocationMetrics': {
        inputTokenCount: 25,
        outputTokenCount: 15,
      },
    });
    expect(usage.promptTokens).toBe(25);
    expect(usage.completionTokens).toBe(15);
    expect(usage.source).toBe(TokenUsageSource.NATIVE);
  });

  it('prefers the Converse usage block over invocation metrics', () => {
    const usage = extractBedrockUsage({
      usage: { inputTokens: 10, outputTokens: 20 },
      'amazon-bedrock-invocationMetrics': {
        inputTokenCount: 999,
        outputTokenCount: 999,
      },
    });
    expect(usage.promptTokens).toBe(10);
    expect(usage.completionTokens).toBe(20);
  });

  it('estimates from text when no usage is present', () => {
    const usage = extractBedrockUsage(
      { output: { message: {} } },
      { promptText: 'hello world', completionText: 'hi there' },
    );
    expect(usage.estimated).toBe(true);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
    expect(usage.promptTokens).toBe(3);
    expect(usage.completionTokens).toBe(2);
  });

  it('handles empty text fallbacks as zero estimates', () => {
    const usage = extractBedrockUsage({}, { promptText: '', completionText: '' });
    expect(usage.totalTokens).toBe(0);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
  });

  it('estimates Arabic completion text', () => {
    const arabic = 'مرحبا بك في كلاو';
    const usage = extractBedrockUsage({}, { completionText: arabic });
    expect(usage.completionTokens).toBe(Math.ceil(arabic.length / 4));
  });

  it('estimates a code-block completion', () => {
    const code = '```go\nfunc main() { println("hi") }\n```';
    const usage = extractBedrockUsage({}, { completionText: code });
    expect(usage.completionTokens).toBe(Math.ceil(code.length / 4));
  });

  it('estimates very long text', () => {
    const long = 'y'.repeat(20_000);
    const usage = extractBedrockUsage({}, { promptText: long });
    expect(usage.promptTokens).toBe(5000);
  });

  it('does not throw and estimates for undefined / malformed responses', () => {
    expect(() => extractBedrockUsage(undefined)).not.toThrow();
    expect(() => extractBedrockUsage('garbage')).not.toThrow();
    expect(() => extractBedrockUsage({ usage: 5 })).not.toThrow();
    const usage = extractBedrockUsage(undefined, { promptText: 'abcd' });
    expect(usage.promptTokens).toBe(1);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
  });
});
