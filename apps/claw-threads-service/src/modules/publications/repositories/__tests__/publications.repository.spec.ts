import { PublicationsRepository } from '../publications.repository';
import { RevisionReviewStatus } from '../../../../generated/prisma';
import { Locale, ThreadPublicationType } from '@claw/shared-types';

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
        reviewStatus: 'READY_FOR_REVIEW',
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

  it('lists the owner publications with the latest title and the address slug', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'pub-1',
        status: 'PUBLISHED',
        slug: 'vector-search',
        updatedAt: new Date('2026-10-07T10:00:00.000Z'),
        revisions: [
          {
            title: 'Vector search',
            reviewStatus: 'OWNER_APPROVED',
            safetyStatus: 'APPROVED',
            indexEligible: true,
          },
        ],
      },
      { id: 'pub-2', status: 'DRAFT', slug: 'uuid-2', updatedAt: new Date(), revisions: [] },
    ]);
    const repository = new PublicationsRepository({ threadPublication: { findMany } } as never);

    const owned = await repository.findOwnedPublications('owner-1');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId: 'owner-1' },
        select: expect.objectContaining({ slug: true }),
      }),
    );
    expect(
      owned.map(({ id, slug, title, pendingRevisionStatus }) => [
        id,
        slug,
        title,
        pendingRevisionStatus,
      ]),
    ).toEqual([
      ['pub-1', 'vector-search', 'Vector search', null],
      ['pub-2', 'uuid-2', null, null],
    ]);
  });

  it('refuses to create a publication after the account deletion tombstone exists', async () => {
    const transaction = {
      threadDeletedAccount: { findUnique: vi.fn().mockResolvedValue({ accountHash: 'digest' }) },
      threadPublication: { upsert: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(transaction)),
    };
    const repository = new PublicationsRepository(prisma as never);

    await expect(
      repository.createQueuedPublication('deleted-user', 'job-1', {
        contentLocale: Locale.EN,
        publicationType: ThreadPublicationType.ARTICLE,
      }),
    ).resolves.toBeNull();
    expect(transaction.threadPublication.upsert).not.toHaveBeenCalled();
  });

  it('persists the selected content language and type on the new publication', async () => {
    const transaction = {
      threadDeletedAccount: { findUnique: vi.fn().mockResolvedValue(null) },
      threadPublication: {
        upsert: vi.fn().mockResolvedValue({ id: 'pub-1', slug: 'slug-1', ownerId: 'owner-1' }),
      },
    };
    const prisma = {
      $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(transaction)),
    };
    const repository = new PublicationsRepository(prisma as never);

    await repository.createQueuedPublication('owner-1', 'job-1', {
      contentLocale: Locale.JA,
      publicationType: ThreadPublicationType.GUIDE,
    });

    expect(transaction.threadPublication.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ contentLocale: 'ja', publicationType: 'guide' }),
      }),
    );
  });

  it('publishes an owned ready revision and returns public fields only', async () => {
    const { repository, transaction } = createRepository(readyRecord);

    const result = await repository.publishReadyRevision('pub_opaque', 'owner-1');

    expect(result).toMatchObject({
      kind: 'PUBLISHED',
      newlyPublished: true,
      publication: {
        id: 'pub_opaque',
        slug: 'research-note-pub_opaq',
        title: 'Research note',
        content: { markdown: '# Research note' },
      },
    });
    expect(transaction.threadPublication.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'research-note-pub_opaq' }),
      }),
    );
    const published = result?.kind === 'PUBLISHED' ? result.publication : undefined;
    expect(published).not.toHaveProperty('ownerId');
    expect(published).not.toHaveProperty('sourceSnapshot');
    expect(transaction.threadPublication.updateMany).toHaveBeenCalledTimes(1);
    expect(transaction.threadPublicationRevision.updateMany).toHaveBeenCalledTimes(1);
  });

  it('leaves state unchanged when the owner has no ready publication', async () => {
    const { repository, transaction } = createRepository(null);

    await expect(repository.publishReadyRevision('pub_opaque', 'owner-2')).resolves.toBeNull();
    expect(transaction.threadPublication.updateMany).not.toHaveBeenCalled();
    expect(transaction.threadPublicationRevision.updateMany).not.toHaveBeenCalled();
  });

  it('publishes nothing when the approval is lost every time it is tried', async () => {
    const { repository, transaction } = createRepository(readyRecord, 0);

    await expect(repository.publishReadyRevision('pub_opaque', 'owner-1')).resolves.toEqual({
      kind: 'NOT_READY',
    });
    expect(transaction.threadPublication.updateMany).not.toHaveBeenCalled();
    expect(transaction.threadPublicationRevision.updateMany).toHaveBeenCalledTimes(3);
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
        slug: 'opaque-slug',
        contentLocale: 'ar',
        publicationType: 'article',
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
      slug: 'opaque-slug',
      title: 'Public article',
      contentLocale: 'ar',
      publicationType: 'article',
      content: {
        markdown: '# Public article',
        citations: [{ url: 'https://example.test/source' }],
      },
      publishedAt: new Date('2026-10-05T12:00:00.000Z'),
      // The id is kept only so PublicationPublicReadService can name the publisher; it strips it.
      ownerId: 'private-owner',
    });
    expect(JSON.stringify(publication)).not.toContain('private-evidence-id');
  });

  it('lists only index-eligible publications in the requested locale without owner ids', async () => {
    const row = {
      slug: 'public-article',
      contentLocale: 'ar',
      publicationType: 'research-article',
      publishedAt: new Date('2026-10-05T12:00:00.000Z'),
      revisions: [
        {
          title: 'Public article',
          content: { markdown: '# Public article\n\nA sourced summary.', citations: [] },
        },
      ],
    };
    const threadPublication = {
      findMany: vi.fn().mockResolvedValue([row]),
    };
    const repository = new PublicationsRepository({ threadPublication } as never);

    const publications = await repository.findPublicDiscoveries(Locale.AR, null, 10);

    expect(threadPublication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PUBLISHED',
          contentLocale: 'ar',
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
    expect(publications).toEqual([
      {
        slug: 'public-article',
        title: 'Public article',
        excerpt: 'A sourced summary.',
        contentLocale: 'ar',
        publicationType: 'research-article',
        publishedAt: row.publishedAt,
      },
    ]);
    expect(JSON.stringify(publications)).not.toContain('ownerId');
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

  it('points only a still-draft owned publication at the retry job', async () => {
    const threadPublication = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) };
    const repository = new PublicationsRepository({ threadPublication } as never);

    await expect(repository.attachRetryJob('pub-1', 'owner-1', 'job-1', 'job-2')).resolves.toBe(
      true,
    );
    expect(threadPublication.updateMany).toHaveBeenCalledWith({
      where: { id: 'pub-1', ownerId: 'owner-1', generationJobId: 'job-1', status: 'DRAFT' },
      data: { generationJobId: 'job-2' },
    });
  });

  it('reports false when the retry job could not be attached', async () => {
    const threadPublication = { updateMany: vi.fn().mockResolvedValue({ count: 0 }) };
    const repository = new PublicationsRepository({ threadPublication } as never);

    await expect(repository.attachRetryJob('pub-1', 'owner-1', 'job-1', 'job-2')).resolves.toBe(
      false,
    );
  });

  it('deletes only an owned publication in a deletable status', async () => {
    const threadPublication = { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) };
    const repository = new PublicationsRepository({ threadPublication } as never);

    await expect(repository.deleteOwnedUnpublished('pub-1', 'owner-1')).resolves.toBe(true);
    expect(threadPublication.deleteMany).toHaveBeenCalledWith({
      where: {
        id: 'pub-1',
        ownerId: 'owner-1',
        status: { in: ['DRAFT', 'READY_FOR_REVIEW', 'UNPUBLISHED'] },
      },
    });
  });

  describe('owner delete status filter', () => {
    async function sentStatuses(): Promise<string[]> {
      let sent: string[] = [];
      const threadPublication = {
        deleteMany: vi.fn(async (args: { where: { status: { in: string[] } } }) => {
          sent = args.where.status.in;
          return { count: 0 };
        }),
      };
      const repository = new PublicationsRepository({ threadPublication } as never);
      await repository.deleteOwnedUnpublished('pub-1', 'owner-1');
      return sent;
    }

    it.each(['PUBLISHED', 'REVOKED'])('never matches a %s row', async (status) => {
      expect(await sentStatuses()).not.toContain(status);
    });

    it.each(['DRAFT', 'READY_FOR_REVIEW', 'UNPUBLISHED'])('matches a %s row', async (status) => {
      expect(await sentStatuses()).toContain(status);
    });
  });

  it('reports false when nothing was deleted', async () => {
    const threadPublication = { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) };
    const repository = new PublicationsRepository({ threadPublication } as never);

    await expect(repository.deleteOwnedUnpublished('pub-1', 'other')).resolves.toBe(false);
  });

  describe('a draft publication whose job failed stays out of every public surface', () => {
    const failedDraft = {
      id: 'pub-failed',
      slug: 'failed-draft',
      status: 'DRAFT',
      contentLocale: 'en',
      publishedAt: null,
      generationJobId: 'job-failed',
      revisions: [],
    };

    /** In-memory stand-in that applies the status and locale filters the repository sends. */
    function prismaOverRows(rows: Array<typeof failedDraft>) {
      const matches = (where: { status?: string; slug?: string; contentLocale?: string }) =>
        rows.filter(
          (row) =>
            (where.status === undefined || row.status === where.status) &&
            (where.slug === undefined || row.slug === where.slug) &&
            (where.contentLocale === undefined || row.contentLocale === where.contentLocale),
        );
      return {
        threadPublication: {
          findMany: vi.fn(async ({ where }: { where: Parameters<typeof matches>[0] }) =>
            matches(where),
          ),
          findFirst: vi.fn(async ({ where }: { where: Parameters<typeof matches>[0] }) => {
            return matches(where)[0] ?? null;
          }),
          count: vi.fn(async ({ where }: { where: Parameters<typeof matches>[0] }) => {
            return matches(where).length;
          }),
        },
      };
    }

    it('is not listed in discovery', async () => {
      const repository = new PublicationsRepository(prismaOverRows([failedDraft]) as never);
      await expect(repository.findPublicDiscoveries(Locale.EN, null, 10)).resolves.toEqual([]);
    });

    it('is not counted or listed in the sitemap', async () => {
      const repository = new PublicationsRepository(prismaOverRows([failedDraft]) as never);
      await expect(repository.countPublicDiscoveries(Locale.EN)).resolves.toBe(0);
      await expect(repository.findPublicSitemapItems(Locale.EN, 0, 10)).resolves.toEqual([]);
    });

    it('is not served by its public slug', async () => {
      const repository = new PublicationsRepository(prismaOverRows([failedDraft]) as never);
      await expect(repository.findPublic('failed-draft')).resolves.toBeNull();
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
    // The last approved revision is NOT staled by an edit: it stays publishable until the new one passes.
    expect(transaction.threadPublicationRevision.updateMany).not.toHaveBeenCalled();
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
      threadPublicationRevision: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ revision: 2 }),
      },
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
    // Only now do the older approvals go stale.
    expect(transaction.threadPublicationRevision.updateMany).toHaveBeenCalledWith({
      where: {
        publicationId: 'publication-1',
        reviewStatus: 'READY_FOR_REVIEW',
        revision: { lt: 2 },
      },
      data: { reviewStatus: 'STALE', indexEligible: false },
    });
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
