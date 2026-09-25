import { EventPattern, type ImageFailedPayload } from '..';

// image-service's `image.failed` wire contract. `supersededById` is optional:
// present only when an AUTO fallback successor already exists, absent otherwise,
// so a consumer written before the field existed reads the same payload.
describe('image.failed event', () => {
  it('uses the canonical routing key', () => {
    expect(EventPattern.IMAGE_FAILED).toBe('image.failed');
  });

  it('accepts a terminal failure without supersededById and a continued one with it', () => {
    const base = {
      generationId: 'g1',
      userId: 'u1',
      provider: 'OPENAI',
      model: 'gpt-image-1',
      prompt: 'a cat',
      errorCode: 'PROVIDER_ERROR',
      errorMessage: 'boom',
      timestamp: new Date().toISOString(),
    } satisfies ImageFailedPayload;
    const continued = { ...base, supersededById: 'g2' } satisfies ImageFailedPayload;

    expect(base).not.toHaveProperty('supersededById');
    expect(continued.supersededById).toBe('g2');
  });
});
