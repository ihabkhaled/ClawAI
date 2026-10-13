import {
  generationDeleteResponseSchema,
  generationProgressSchema,
  generationRetryResponseSchema,
} from '../generation-progress.schema';

const validProgress = {
  jobId: 'job-1',
  status: 'FAILED',
  stage: 'AUTHOR_DRAFTS',
  round: 1,
  attemptCount: 1,
  maxAttempts: 3,
  spentMicroCredits: '0',
  createdAt: '2026-10-13T10:00:00.000Z',
  updatedAt: '2026-10-13T10:01:00.000Z',
  selections: {
    topic: 'A research topic',
    publicationType: 'article',
    contentLocale: 'en',
    sourceThreadId: 'thread-1',
    spendCapMicroUsd: '2000000',
    roles: [
      {
        roleId: 'author-1',
        roleKind: 'AUTHOR',
        provider: 'gemini',
        model: 'pro',
        fallbacks: [{ provider: 'openai', model: 'gpt' }],
      },
    ],
  },
  failure: {
    code: 'PAYG_CREDIT_EXHAUSTED',
    failedStage: 'AUTHOR_DRAFTS',
    roleId: 'author-1',
    httpStatus: 402,
    retryable: true,
  },
  steps: [
    {
      seq: 1,
      at: '2026-10-13T10:00:30.000Z',
      stage: 'AUTHOR_DRAFTS',
      round: 1,
      outcome: 'FAILED',
      roleKind: 'AUTHOR',
      roleId: 'author-1',
      provider: 'gemini',
      model: 'pro',
      code: 'PAYG_CREDIT_EXHAUSTED',
      httpStatus: 402,
      durationMs: 120,
      inputTokens: null,
      outputTokens: null,
      excerpt: null,
    },
  ],
};

describe('generation progress schemas', () => {
  it('accepts a complete failed-job progress record', () => {
    expect(generationProgressSchema.safeParse(validProgress).success).toBe(true);
  });

  it('accepts a job without a failure', () => {
    expect(generationProgressSchema.safeParse({ ...validProgress, failure: null }).success).toBe(
      true,
    );
  });

  it('rejects an unknown step outcome', () => {
    const steps = [{ ...validProgress.steps[0], outcome: 'EXPLODED' }];
    expect(generationProgressSchema.safeParse({ ...validProgress, steps }).success).toBe(false);
  });

  it('validates retry and delete responses', () => {
    expect(generationRetryResponseSchema.safeParse({ jobId: 'j', status: 'QUEUED' }).success).toBe(
      true,
    );
    expect(generationDeleteResponseSchema.safeParse({ deleted: true }).success).toBe(true);
    expect(generationDeleteResponseSchema.safeParse({ deleted: false }).success).toBe(false);
  });

  describe('size bounds', () => {
    const step = validProgress.steps[0];
    const parse = (override: object) =>
      generationProgressSchema.safeParse({ ...validProgress, ...override }).success;

    it('rejects more than 500 steps', () => {
      expect(parse({ steps: Array.from({ length: 501 }, () => step) })).toBe(false);
    });

    it('accepts exactly 500 steps', () => {
      expect(parse({ steps: Array.from({ length: 500 }, () => step) })).toBe(true);
    });

    it('rejects an excerpt over 1200 characters', () => {
      expect(parse({ steps: [{ ...step, excerpt: 'x'.repeat(1201) }] })).toBe(false);
    });

    it('accepts a topic of exactly 10000 characters', () => {
      const selections = { ...validProgress.selections, topic: 'x'.repeat(10_000) };
      expect(parse({ selections })).toBe(true);
    });

    it('rejects an oversized topic', () => {
      const selections = { ...validProgress.selections, topic: 'x'.repeat(10_001) };
      expect(parse({ selections })).toBe(false);
    });

    it('rejects an oversized spentMicroCredits', () => {
      expect(parse({ spentMicroCredits: '9'.repeat(41) })).toBe(false);
    });

    it('rejects an oversized plain string field', () => {
      expect(parse({ stage: 'x'.repeat(201) })).toBe(false);
    });
  });
});
