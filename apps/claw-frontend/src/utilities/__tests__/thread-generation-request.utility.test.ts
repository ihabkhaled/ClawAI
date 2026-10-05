import { describe, expect, it } from 'vitest';

import { createThreadGenerationRequest } from '../thread-generation-request.utility';

const models = Array.from({ length: 5 }, (_, index) => ({
  provider: 'OPENAI',
  model: `model-${index}`,
  displayName: `Model ${index}`,
}));

describe('createThreadGenerationRequest', () => {
  it('converts the selected cap and assigns three authors plus Judge and Critic', () => {
    const request = createThreadGenerationRequest({
      sourceThreadId: 'chat-1',
      topic: '  Explain database indexes  ',
      publicationType: 'technical-explanation',
      spendCapUsd: 1.25,
      models,
      idempotencyKey: 'request-1',
      correlationId: 'correlation-1',
    });

    expect(request).toMatchObject({
      capMicroUsd: 1_250_000,
      topic: 'Explain database indexes',
      publicIntentVersion: 'threads-public-v1',
      authors: [{ id: 'author-1' }, { id: 'author-2' }, { id: 'author-3' }],
      judge: { id: 'judge' },
      critic: { id: 'critic' },
    });
  });

  it('rejects unsafe caps or incomplete model roles', () => {
    expect(() =>
      createThreadGenerationRequest({
        sourceThreadId: 'chat-1',
        topic: 'Explain indexes',
        publicationType: 'article',
        spendCapUsd: 0,
        models,
        idempotencyKey: 'request-1',
        correlationId: 'correlation-1',
      }),
    ).toThrow('A positive, safe spend cap is required');
    expect(() =>
      createThreadGenerationRequest({
        sourceThreadId: 'chat-1',
        topic: 'Explain indexes',
        publicationType: 'article',
        spendCapUsd: 1,
        models: models.slice(0, 4),
        idempotencyKey: 'request-1',
        correlationId: 'correlation-1',
      }),
    ).toThrow('Select a model for every author and reviewer');
  });
});
