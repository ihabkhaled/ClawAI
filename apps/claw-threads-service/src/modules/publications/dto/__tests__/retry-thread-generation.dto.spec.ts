import { retryThreadGenerationSchema } from '../retry-thread-generation.dto';

describe('retryThreadGenerationSchema', () => {
  it('accepts a bare retry with only an idempotency key', () => {
    expect(retryThreadGenerationSchema.safeParse({ idempotencyKey: 'retry-1' }).success).toBe(true);
  });

  it('accepts a changed topic, cap and model list', () => {
    const result = retryThreadGenerationSchema.safeParse({
      idempotencyKey: 'retry-2',
      topic: 'A changed topic that is long enough',
      spendCapUsd: 2.5,
      models: [{ roleId: 'author-1', provider: 'gemini', model: 'gemini-pro' }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a retry cap exactly at the documented minimum of one cent', () => {
    expect(
      retryThreadGenerationSchema.safeParse({ idempotencyKey: 'k', spendCapUsd: 0.01 }).success,
    ).toBe(true);
  });

  it.each([
    { idempotencyKey: '' },
    { idempotencyKey: 'k', topic: 'short' },
    { idempotencyKey: 'k', spendCapUsd: 0 },
    { idempotencyKey: 'k', spendCapUsd: 0.001 },
    { idempotencyKey: 'k', spendCapUsd: 5000 },
    { idempotencyKey: 'k', models: [{ roleId: 'a', provider: '', model: 'm' }] },
    { idempotencyKey: 'k', unexpected: true },
  ])('rejects %j', (input) => {
    expect(retryThreadGenerationSchema.safeParse(input).success).toBe(false);
  });
});
