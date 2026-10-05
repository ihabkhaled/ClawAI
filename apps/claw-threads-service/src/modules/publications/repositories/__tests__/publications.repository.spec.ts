import { PublicationsRepository } from '../publications.repository';
import { RevisionReviewStatus } from '../../../../generated/prisma';

describe('PublicationsRepository', () => {
  const readyRecord = {
    id: 'pub_opaque',
    slug: 'research-note',
    status: 'READY_FOR_REVIEW',
    publishedAt: null,
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

  it('refuses to create a publication after the account deletion tombstone exists', async () => {
    const transaction = {
      threadDeletedAccount: { findUnique: vi.fn().mockResolvedValue({ accountHash: 'digest' }) },
      threadPublication: { upsert: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(transaction)),
    };
    const repository = new PublicationsRepository(prisma as never);

    await expect(repository.createQueuedPublication('deleted-user', 'job-1')).resolves.toBeNull();
    expect(transaction.threadPublication.upsert).not.toHaveBeenCalled();
  });

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

  it('creates a private immutable edit revision with exact-content hashes', async () => {
    const transaction = {
      threadPublicationRevision: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue({ revision: 1 }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: 'revision-2',
          revision: data.revision,
          reviewStatus: data.reviewStatus,
          safetyStatus: data.safetyStatus,
          safetyReasons: data.safetyReasons,
        })),
      },
      threadPublication: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'publication-1',
          ownerId: 'owner-1',
          generationJobId: 'generation-1',
          status: 'READY_FOR_REVIEW',
        }),
      },
    };
    const repository = new PublicationsRepository({
      $transaction: vi.fn((operation: (tx: unknown) => unknown) => operation(transaction)),
    } as never);
    const input = {
      markdown: '# Updated article',
      citations: [{ evidenceId: 'evidence-1', url: 'https://example.test/source' }],
      capMicroUsd: 2_000_000,
      idempotencyKey: 'edit-key',
      correlationId: 'edit-correlation',
    };

    await expect(
      repository.createEditedRevision('publication-1', 'owner-1', input, {
        approved: true,
        reasons: [],
      }),
    ).resolves.toMatchObject({
      id: 'revision-2',
      revision: 2,
      generationJobId: 'generation-1',
      revalidationJobId: null,
      reviewStatus: RevisionReviewStatus.PENDING,
      safetyApproved: true,
      requestMatches: true,
    });
    expect(transaction.threadPublicationRevision.updateMany).toHaveBeenCalledWith({
      where: { publicationId: 'publication-1', reviewStatus: 'READY_FOR_REVIEW' },
      data: { reviewStatus: 'STALE', indexEligible: false },
    });
    expect(transaction.threadPublicationRevision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          publicationId: 'publication-1',
          revision: 2,
          editIdempotencyKey: 'edit-key',
          reviewStatus: 'PENDING',
          indexEligible: false,
        }),
      }),
    );
  });

  it('marks only the matching private candidate ready after exact-hash validation', async () => {
    const transaction = {
      threadPublicationRevision: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      threadPublication: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const repository = new PublicationsRepository({
      $transaction: vi.fn((operation: (tx: unknown) => unknown) => operation(transaction)),
    } as never);

    await repository.completeRevisionReview('publication-1', 'owner-1', 'revision-2', {
      contentHash: 'a'.repeat(64),
      ready: true,
      judgeScore: 85,
      criticScore: 78,
    });

    expect(transaction.threadPublicationRevision.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'revision-2',
          publicationId: 'publication-1',
          contentHash: 'a'.repeat(64),
          reviewStatus: 'PENDING',
        }),
        data: expect.objectContaining({
          reviewStatus: 'READY_FOR_REVIEW',
          judgeScore: 85,
          criticScore: 78,
          safetyStatus: 'APPROVED',
          indexEligible: true,
        }),
      }),
    );
    expect(transaction.threadPublication.updateMany).toHaveBeenCalledWith({
      where: { id: 'publication-1', ownerId: 'owner-1', status: 'READY_FOR_REVIEW' },
      data: { status: 'READY_FOR_REVIEW' },
    });
  });

  it('prevents a second paid edit review while the latest candidate is pending', async () => {
    const transaction = {
      threadPublicationRevision: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue({
          id: 'revision-2',
          revision: 2,
          reviewStatus: RevisionReviewStatus.PENDING,
          revalidationJobId: 'review-job',
        }),
        create: vi.fn(),
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

    await expect(
      repository.createEditedRevision(
        'publication-1',
        'owner-1',
        {
          markdown: '# Another edit',
          citations: [{ evidenceId: 'evidence-1', url: 'https://example.test/source' }],
          capMicroUsd: 2_000_000,
          idempotencyKey: 'second-edit',
          correlationId: 'second-correlation',
        },
        { approved: true, reasons: [] },
      ),
    ).resolves.toMatchObject({ editInProgress: true, id: 'revision-2' });
    expect(transaction.threadPublicationRevision.create).not.toHaveBeenCalled();
  });
});
