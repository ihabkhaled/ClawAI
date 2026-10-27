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

  it('leaves the one-cent floor to the preflight so the refusal carries a machine code', () => {
    expect(
      retryThreadGenerationSchema.safeParse({ idempotencyKey: 'k', spendCapUsd: 0.001 }).success,
    ).toBe(true);
  });

  it('accepts refreshResearch as a boolean and nothing else (ADR-193)', () => {
    expect(
      retryThreadGenerationSchema.safeParse({ idempotencyKey: 'k', refreshResearch: true }).success,
    ).toBe(true);
    expect(
      retryThreadGenerationSchema.safeParse({ idempotencyKey: 'k', refreshResearch: false })
        .success,
    ).toBe(true);
    expect(
      retryThreadGenerationSchema.safeParse({ idempotencyKey: 'k', refreshResearch: 'yes' })
        .success,
    ).toBe(false);
  });

  it('accepts at most 8 evidence gaps of at most 300 characters each (ADR-194)', () => {
    const parse = (acceptedEvidenceGaps: unknown) =>
      retryThreadGenerationSchema.safeParse({ idempotencyKey: 'k', acceptedEvidenceGaps }).success;

    expect(parse(['no primary sources for sycophancy'])).toBe(true);
    expect(parse([])).toBe(true);
    expect(parse(Array.from({ length: 8 }, (_, i) => `gap ${String(i)}`))).toBe(true);
    expect(parse(Array.from({ length: 9 }, (_, i) => `gap ${String(i)}`))).toBe(false);
    expect(parse(['x'.repeat(300)])).toBe(true);
    expect(parse(['x'.repeat(301)])).toBe(false);
  });

  it.each([[[42]], [['   ']], [['']], ['gap'], [{ 0: 'gap' }], [['bad\u0000text']], [[null]]])(
    'rejects acceptedEvidenceGaps %j',
    (value) => {
      expect(
        retryThreadGenerationSchema.safeParse({ idempotencyKey: 'k', acceptedEvidenceGaps: value })
          .success,
      ).toBe(false);
    },
  );

  it('accepts up to 8 blocker indexes, each 0 to 7, and nothing else (ADR-195)', () => {
    const parse = (acceptedEvidenceGapIndexes: unknown) =>
      retryThreadGenerationSchema.safeParse({ idempotencyKey: 'k', acceptedEvidenceGapIndexes })
        .success;

    expect(parse([0, 1, 7])).toBe(true);
    expect(parse([])).toBe(true);
    expect(parse(Array.from({ length: 9 }, (_, i) => i % 8))).toBe(false);
    expect(parse([8])).toBe(false);
    expect(parse([-1])).toBe(false);
    expect(parse([1.5])).toBe(false);
    expect(parse(['1'])).toBe(false);
    expect(parse(0)).toBe(false);
  });

  it('trims an accepted gap before it is forwarded', () => {
    const parsed = retryThreadGenerationSchema.parse({
      idempotencyKey: 'k',
      acceptedEvidenceGaps: ['  no sources  '],
    });

    expect(parsed.acceptedEvidenceGaps).toEqual(['no sources']);
  });

  it.each([
    { idempotencyKey: '' },
    { idempotencyKey: 'k', topic: 'short' },
    { idempotencyKey: 'k', spendCapUsd: 0 },
    { idempotencyKey: 'k', spendCapUsd: 5000 },
    { idempotencyKey: 'k', models: [{ roleId: 'a', provider: '', model: 'm' }] },
    { idempotencyKey: 'k', unexpected: true },
  ])('rejects %j', (input) => {
    expect(retryThreadGenerationSchema.safeParse(input).success).toBe(false);
  });
});
