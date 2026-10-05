import { startThreadGenerationSchema } from '../start-thread-generation.dto';

const role = (id: string) => ({
  id,
  provider: 'provider',
  model: 'model',
  maxOutputTokens: 512,
  fallbacks: [],
});

const validRequest = {
  capMicroUsd: 2_000_000,
  sourceThreadId: 'thread-1',
  idempotencyKey: 'request-1',
  correlationId: 'correlation-1',
  publicIntentVersion: 'threads-public-v1',
  contentLocale: 'ar',
  topic: 'A detailed research subject that is at least ten characters',
  publicationType: 'article',
  authors: [role('author-1'), role('author-2'), role('author-3')],
  judge: role('judge'),
  critic: role('critic'),
};

describe('startThreadGenerationSchema', () => {
  it('accepts a user-selected cap and the current public intent version', () => {
    expect(startThreadGenerationSchema.safeParse(validRequest).success).toBe(true);
  });

  it('requires the owner-facing public intent acknowledgement and three authors', () => {
    expect(
      startThreadGenerationSchema.safeParse({
        ...validRequest,
        publicIntentVersion: 'old-disclosure',
        authors: [role('author-1'), role('author-2')],
      }).success,
    ).toBe(false);
  });

  it('rejects caps outside the safe integer range', () => {
    expect(
      startThreadGenerationSchema.safeParse({
        ...validRequest,
        capMicroUsd: Number.MAX_SAFE_INTEGER + 1,
      }).success,
    ).toBe(false);
  });

  it('requires one supported content locale for correct indexing', () => {
    expect(startThreadGenerationSchema.safeParse(validRequest).success).toBe(true);
    expect(
      startThreadGenerationSchema.safeParse({ ...validRequest, contentLocale: 'xx' }).success,
    ).toBe(false);
  });
});
