import { PublicationsRepository } from '../publications.repository';

const draft = {
  markdown:
    '# Agent failure patterns\n\nBody.\n\n## Limitations and unverified items\n\n- No sources.',
  citations: [{ evidenceId: 'source-1', url: 'https://example.test/source' }],
  judgeScore: 86,
  criticScore: 79,
};

function draftRepository(): {
  repository: PublicationsRepository;
  upsert: ReturnType<typeof vi.fn>;
} {
  const upsert = vi.fn().mockResolvedValue({});
  const transaction = {
    threadPublication: {
      findUnique: vi.fn().mockResolvedValue({ status: 'DRAFT' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    threadPublicationRevision: { upsert },
  };
  const prisma = {
    $transaction: vi.fn((operation: (tx: unknown) => unknown) => operation(transaction)),
  };
  return { repository: new PublicationsRepository(prisma as never), upsert };
}

describe('gaps disclosed on a stored article (ADR-194)', () => {
  it('stores the flag in the revision content only when the owner accepted gaps', async () => {
    const disclosed = draftRepository();
    const plain = draftRepository();

    await disclosed.repository.savePrivateDraft('pub-1', { ...draft, gapsDisclosed: true });
    await plain.repository.savePrivateDraft('pub-1', draft);

    const disclosedCall = disclosed.upsert.mock.calls[0]?.[0].create;
    const plainCall = plain.upsert.mock.calls[0]?.[0].create;
    expect(disclosedCall.content).toEqual({
      markdown: draft.markdown,
      citations: draft.citations,
      gapsDisclosed: true,
    });
    expect(plainCall.content).toEqual({ markdown: draft.markdown, citations: draft.citations });
    expect(plainCall.content).not.toHaveProperty('gapsDisclosed');
    // The safety scan and the review thresholds run the same: the flag changes neither.
    expect(disclosedCall.safetyStatus).toBe(plainCall.safetyStatus);
    expect(disclosedCall.reviewStatus).toBe(plainCall.reviewStatus);
  });

  it('a false flag stores nothing extra', async () => {
    const { repository, upsert } = draftRepository();

    await repository.savePrivateDraft('pub-1', { ...draft, gapsDisclosed: false });

    expect(upsert.mock.calls[0]?.[0].create.content).not.toHaveProperty('gapsDisclosed');
  });

  function publicRow(content: Record<string, unknown>): Record<string, unknown> {
    return {
      slug: 'opaque-slug',
      contentLocale: 'en',
      publicationType: 'article',
      publishedAt: new Date('2026-10-05T12:00:00.000Z'),
      ownerId: 'o',
      viewCount: 0,
      readerCount: 0,
      revisions: [{ title: 'Public article', content }],
    };
  }

  it('the public record tells readers the gaps were disclosed', async () => {
    const threadPublication = {
      findFirst: vi
        .fn()
        .mockResolvedValue(publicRow({ markdown: '# Public article', gapsDisclosed: true })),
    };
    const repository = new PublicationsRepository({ threadPublication } as never);

    const publication = await repository.findPublic('opaque-slug');

    expect(publication?.gapsDisclosed).toBe(true);
  });

  it('is false for an article without the flag', async () => {
    const threadPublication = {
      findFirst: vi.fn().mockResolvedValue(publicRow({ markdown: '# Public article' })),
    };
    const repository = new PublicationsRepository({ threadPublication } as never);

    const publication = await repository.findPublic('opaque-slug');

    expect(publication?.gapsDisclosed).toBe(false);
  });

  it('an owner edit keeps the disclosure of the article it edits', async () => {
    const create = vi.fn().mockImplementation(async ({ data }) => ({
      id: 'revision-2',
      revision: data.revision,
      reviewStatus: data.reviewStatus,
      safetyStatus: data.safetyStatus,
      safetyReasons: data.safetyReasons,
    }));
    const transaction = {
      threadPublicationRevision: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue({
          id: 'revision-1',
          revision: 1,
          reviewStatus: 'OWNER_APPROVED',
          revalidationJobId: null,
          content: { markdown: '# Old', citations: [], gapsDisclosed: true },
        }),
        create,
      },
      threadPublication: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'publication-1',
          ownerId: 'owner-1',
          generationJobId: 'generation-1',
          status: 'PUBLISHED',
        }),
      },
    };
    const repository = new PublicationsRepository({
      $transaction: vi.fn((operation: (tx: unknown) => unknown) => operation(transaction)),
    } as never);

    await repository.createEditedRevision(
      'publication-1',
      'owner-1',
      {
        markdown: '# Updated article',
        citations: [],
        capMicroUsd: 2_000_000,
        idempotencyKey: 'edit-key',
        correlationId: 'edit-correlation',
      },
      { approved: true, reasons: [] },
    );

    expect(create.mock.calls[0]?.[0].data.content).toEqual({
      markdown: '# Updated article',
      citations: [],
      gapsDisclosed: true,
    });
  });
});
