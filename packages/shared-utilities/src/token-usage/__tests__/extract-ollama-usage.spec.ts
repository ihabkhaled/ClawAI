import { TokenEstimatorKind, TokenUsageSource } from '@claw/shared-types';

import { extractOllamaUsage } from '../extract-ollama-usage.utility';

describe('extractOllamaUsage', () => {
  it('reads native snake_case usage (prompt_eval_count / eval_count)', () => {
    const usage = extractOllamaUsage({
      prompt_eval_count: 60,
      eval_count: 24,
      done: true,
    });
    expect(usage).toEqual({
      promptTokens: 60,
      completionTokens: 24,
      totalTokens: 84,
      estimated: false,
      source: TokenUsageSource.NATIVE,
      estimator: TokenEstimatorKind.NONE,
    });
  });

  it('reads native camelCase usage (promptEvalCount / evalCount)', () => {
    const usage = extractOllamaUsage({ promptEvalCount: 11, evalCount: 9 });
    expect(usage.promptTokens).toBe(11);
    expect(usage.completionTokens).toBe(9);
    expect(usage.source).toBe(TokenUsageSource.NATIVE);
  });

  it('estimates from text when counts are missing', () => {
    const usage = extractOllamaUsage(
      { response: 'ok', done: true },
      { promptText: 'hello world', completionText: 'hi there' },
    );
    expect(usage.estimated).toBe(true);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
    expect(usage.estimator).toBe(TokenEstimatorKind.CHAR_DIV_4);
    expect(usage.promptTokens).toBe(3);
    expect(usage.completionTokens).toBe(2);
  });

  it('handles empty text fallbacks as zero estimates', () => {
    const usage = extractOllamaUsage({}, { promptText: '', completionText: '' });
    expect(usage.totalTokens).toBe(0);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
  });

  it('estimates Arabic completion text', () => {
    const arabic = 'مرحبا بك في كلاو';
    const usage = extractOllamaUsage({}, { completionText: arabic });
    expect(usage.completionTokens).toBe(Math.ceil(arabic.length / 4));
  });

  it('estimates a code-block completion', () => {
    const code = '```rust\nfn main() { println!("hi"); }\n```';
    const usage = extractOllamaUsage({}, { completionText: code });
    expect(usage.completionTokens).toBe(Math.ceil(code.length / 4));
  });

  it('estimates very long text', () => {
    const long = 'z'.repeat(16_000);
    const usage = extractOllamaUsage({}, { promptText: long });
    expect(usage.promptTokens).toBe(4000);
  });

  it('does not throw and estimates for undefined / malformed responses', () => {
    expect(() => extractOllamaUsage(undefined)).not.toThrow();
    expect(() => extractOllamaUsage('garbage')).not.toThrow();
    expect(() => extractOllamaUsage({ eval_count: 'NaN' })).not.toThrow();
    const usage = extractOllamaUsage(undefined, { promptText: 'abcd' });
    expect(usage.promptTokens).toBe(1);
    expect(usage.source).toBe(TokenUsageSource.ESTIMATED);
  });
});
