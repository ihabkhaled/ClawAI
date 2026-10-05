import { describe, expect, it } from 'vitest';

import { createThreadRevisionRequest } from '../thread-revision-request.utility';

describe('createThreadRevisionRequest', () => {
  it('keeps edited content and citations under a user-selected integer micro-USD cap', () => {
    expect(
      createThreadRevisionRequest({
        markdown: 'Revised article',
        citations: [{ evidenceId: 'source-1', url: 'https://example.com/source' }],
        spendCapUsd: 0.75,
        idempotencyKey: 'revision-1',
        correlationId: 'correlation-1',
      }),
    ).toEqual({
      markdown: 'Revised article',
      citations: [{ evidenceId: 'source-1', url: 'https://example.com/source' }],
      capMicroUsd: 750_000,
      idempotencyKey: 'revision-1',
      correlationId: 'correlation-1',
    });
  });

  it('rejects blank content, missing citations, and an invalid cap', () => {
    const input = {
      markdown: '  ',
      citations: [{ evidenceId: 'source-1', url: 'https://example.com/source' }],
      spendCapUsd: 1,
      idempotencyKey: 'revision-1',
      correlationId: 'correlation-1',
    };

    expect(() => createThreadRevisionRequest(input)).toThrow('Revision content is required');
    expect(() =>
      createThreadRevisionRequest({ ...input, markdown: 'valid', citations: [] }),
    ).toThrow('At least one citation is required');
    expect(() =>
      createThreadRevisionRequest({ ...input, markdown: 'valid', spendCapUsd: 0 }),
    ).toThrow('A positive, safe spend cap is required');
  });
});
