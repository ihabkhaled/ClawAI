import type { StartThreadGenerationDto } from '../../dto/start-thread-generation.dto';
import { scopedIdempotencyKey, startRequestFingerprint } from '../generation-idempotency.utility';

const role = (id: string) => ({
  id,
  provider: 'GEMINI',
  model: 'gemini-2.5-flash',
  maxOutputTokens: 512,
  fallbacks: [],
});

const request = {
  capMicroUsd: 2_000_000,
  sourceThreadId: 'thread-1',
  idempotencyKey: 'request-1',
  correlationId: 'correlation-1',
  publicIntentVersion: 'threads-public-v1',
  contentLocale: 'en',
  topic: 'A detailed research subject',
  publicationType: 'article',
  authors: [role('author-1'), role('author-2'), role('author-3')],
  judge: role('judge'),
  critic: role('critic'),
} as StartThreadGenerationDto;

describe('scopedIdempotencyKey', () => {
  it('is stable for one owner and key', () => {
    expect(scopedIdempotencyKey('owner-1', 'k')).toBe(scopedIdempotencyKey('owner-1', 'k'));
  });

  it('differs between owners using the same key (D-08)', () => {
    expect(scopedIdempotencyKey('owner-1', 'k')).not.toBe(scopedIdempotencyKey('owner-2', 'k'));
  });

  it('cannot be forged by moving the boundary between owner and key', () => {
    expect(scopedIdempotencyKey('owner-1', '2-k')).not.toBe(scopedIdempotencyKey('owner-12', '-k'));
    expect(scopedIdempotencyKey('a', 'b\nc')).not.toBe(scopedIdempotencyKey('a\nb', 'c'));
  });

  it('is a 64 character hex string and never contains the raw key', () => {
    const scoped = scopedIdempotencyKey('owner-1', 'my-secret-key');
    expect(scoped).toMatch(/^[0-9a-f]{64}$/u);
    expect(scoped).not.toContain('my-secret-key');
  });
});

describe('startRequestFingerprint', () => {
  it('ignores the idempotency key and the correlation id', () => {
    expect(
      startRequestFingerprint({ ...request, idempotencyKey: 'other', correlationId: 'x' }),
    ).toBe(startRequestFingerprint(request));
  });

  it('ignores the order of fields', () => {
    const reordered = Object.fromEntries(
      Object.entries(request).reverse(),
    ) as unknown as StartThreadGenerationDto;
    expect(startRequestFingerprint(reordered)).toBe(startRequestFingerprint(request));
  });

  it.each([
    ['topic', { topic: 'Another subject entirely' }],
    ['cap', { capMicroUsd: 3_000_000 }],
    ['locale', { contentLocale: 'fr' }],
    ['judge model', { judge: { ...role('judge'), model: 'other' } }],
    [
      'an author fallback',
      {
        authors: [
          { ...role('author-1'), fallbacks: [{ provider: 'X', model: 'y' }] },
          role('author-2'),
          role('author-3'),
        ],
      },
    ],
  ])('changes when the %s changes', (_name, change) => {
    expect(startRequestFingerprint({ ...request, ...change } as StartThreadGenerationDto)).not.toBe(
      startRequestFingerprint(request),
    );
  });
});
