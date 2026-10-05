import { editPublicationRevisionSchema } from '../edit-publication-revision.dto';

describe('editPublicationRevisionSchema', () => {
  const valid = {
    markdown: '# Revised article',
    citations: [{ evidenceId: 'evidence-1', url: 'https://example.test/source' }],
    capMicroUsd: 2_000_000,
    idempotencyKey: 'edit-request-1',
    correlationId: 'edit-correlation-1',
  };

  it('accepts a bounded edit with an explicit cap and idempotency key', () => {
    expect(editPublicationRevisionSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects edits without citations, a selected cap, or a stable request key', () => {
    expect(editPublicationRevisionSchema.safeParse({ ...valid, citations: [] }).success).toBe(
      false,
    );
    expect(editPublicationRevisionSchema.safeParse({ ...valid, capMicroUsd: 0 }).success).toBe(
      false,
    );
    expect(editPublicationRevisionSchema.safeParse({ ...valid, idempotencyKey: '' }).success).toBe(
      false,
    );
  });
});
