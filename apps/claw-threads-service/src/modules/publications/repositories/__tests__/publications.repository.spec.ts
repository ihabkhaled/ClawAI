import { PublicationsRepository } from '../publications.repository';

describe('PublicationsRepository', () => {
  const readyRecord = {
    id: 'pub_opaque',
    slug: 'research-note',
    revisions: [
      {
        id: 'revision-1',
        title: 'Research note',
        content: { markdown: '# Research note' },
      },
    ],
  };

  function createRepository(record: unknown, approvedCount = 1) {
    const transaction = {
      threadPublication: {
        findFirst: vi.fn().mockResolvedValue(record),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      threadPublicationRevision: {
        updateMany: vi.fn().mockResolvedValue({ count: approvedCount }),
      },
    };
    const prisma = {
      $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(transaction)),
    };
    return { repository: new PublicationsRepository(prisma as never), transaction };
  }

  it('publishes an owned ready revision and returns public fields only', async () => {
    const { repository, transaction } = createRepository(readyRecord);

    const result = await repository.publishReadyRevision('pub_opaque', 'owner-1');

    expect(result).toMatchObject({
      id: 'pub_opaque',
      slug: 'research-note',
      title: 'Research note',
      content: { markdown: '# Research note' },
    });
    expect(result).not.toHaveProperty('ownerId');
    expect(result).not.toHaveProperty('sourceSnapshot');
    expect(transaction.threadPublication.updateMany).toHaveBeenCalledTimes(1);
    expect(transaction.threadPublicationRevision.updateMany).toHaveBeenCalledTimes(1);
  });

  it('leaves state unchanged when the owner has no ready publication', async () => {
    const { repository, transaction } = createRepository(null);

    await expect(repository.publishReadyRevision('pub_opaque', 'owner-2')).resolves.toBeNull();
    expect(transaction.threadPublication.updateMany).not.toHaveBeenCalled();
    expect(transaction.threadPublicationRevision.updateMany).not.toHaveBeenCalled();
  });

  it('restores review state if the revision changes before approval', async () => {
    const { repository, transaction } = createRepository(readyRecord, 0);

    await expect(repository.publishReadyRevision('pub_opaque', 'owner-1')).resolves.toBeNull();
    expect(transaction.threadPublication.updateMany).toHaveBeenCalledTimes(2);
    expect(transaction.threadPublicationRevision.updateMany).toHaveBeenCalledTimes(1);
  });

  it('stores a completed generation as a private pending revision', async () => {
    const transaction = {
      threadPublication: {
        findUnique: vi.fn().mockResolvedValue({ status: 'DRAFT' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      threadPublicationRevision: { upsert: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: vi.fn((operation: (tx: unknown) => unknown) => operation(transaction)),
    };
    const repository = new PublicationsRepository(prisma as never);
    const draft = {
      markdown: '# Private draft\n\nDraft text',
      citations: [{ evidenceId: 'source-1', url: 'https://example.test/source' }],
      judgeScore: 86,
      criticScore: 79,
    };

    await repository.savePrivateDraft('pub-1', draft);

    expect(transaction.threadPublicationRevision.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          title: 'Private draft',
          reviewStatus: 'READY_FOR_REVIEW',
          judgeScore: 86,
          criticScore: 79,
          safetyStatus: 'APPROVED',
          safetyReasons: [],
          indexEligible: true,
        }),
        update: {},
      }),
    );
    expect(transaction.threadPublication.updateMany).toHaveBeenCalledWith({
      where: { id: 'pub-1', status: 'DRAFT' },
      data: { status: 'READY_FOR_REVIEW' },
    });
  });

  it('keeps a safety flagged draft private and unpublishable', async () => {
    const transaction = {
      threadPublication: {
        findUnique: vi.fn().mockResolvedValue({ status: 'DRAFT' }),
        updateMany: vi.fn(),
      },
      threadPublicationRevision: { upsert: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: vi.fn((operation: (tx: unknown) => unknown) => operation(transaction)),
    };
    const repository = new PublicationsRepository(prisma as never);

    await repository.savePrivateDraft('pub-1', {
      markdown: `# Private draft\n\napi_key=${'A'.repeat(20)}`,
      citations: [],
      judgeScore: 90,
      criticScore: 80,
    });

    expect(transaction.threadPublicationRevision.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          reviewStatus: 'PENDING',
          safetyStatus: 'REVIEW_REQUIRED',
          safetyReasons: ['POSSIBLE_SECRET'],
          indexEligible: false,
        }),
      }),
    );
    expect(transaction.threadPublication.updateMany).not.toHaveBeenCalled();
  });

  it('resolves only published owner-approved safety-cleared fields', async () => {
    const threadPublication = {
      findFirst: vi.fn().mockResolvedValue({
        id: 'publication-1',
        slug: 'opaque-slug',
        publishedAt: new Date('2026-10-05T12:00:00.000Z'),
        ownerId: 'private-owner',
        revisions: [
          {
            title: 'Public article',
            content: {
              markdown: '# Public article',
              citations: [
                { evidenceId: 'private-evidence-id', url: 'https://example.test/source' },
              ],
            },
          },
        ],
      }),
    };
    const repository = new PublicationsRepository({ threadPublication } as never);

    const publication = await repository.findPublic('opaque-slug');

    expect(threadPublication.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PUBLISHED',
          revisions: {
            some: {
              reviewStatus: 'OWNER_APPROVED',
              safetyStatus: 'APPROVED',
              indexEligible: true,
            },
          },
        }),
      }),
    );
    expect(publication).toEqual({
      id: 'publication-1',
      slug: 'opaque-slug',
      title: 'Public article',
      content: {
        markdown: '# Public article',
        citations: [{ url: 'https://example.test/source' }],
      },
      publishedAt: new Date('2026-10-05T12:00:00.000Z'),
    });
    expect(publication).not.toHaveProperty('ownerId');
    expect(JSON.stringify(publication)).not.toContain('private-evidence-id');
  });

  it('unpublishes only an owned currently published record', async () => {
    const threadPublication = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) };
    const repository = new PublicationsRepository({ threadPublication } as never);

    await expect(repository.unpublishOwned('publication-1', 'owner-1')).resolves.toBe(true);
    expect(threadPublication.updateMany).toHaveBeenCalledWith({
      where: { id: 'publication-1', ownerId: 'owner-1', status: 'PUBLISHED' },
      data: { status: 'UNPUBLISHED', publishedAt: null },
    });
  });
});
