import { Prisma } from '../../../../generated/prisma';
import { Locale, ThreadPublicationType } from '@claw/shared-types';

import { PublicationsRepository } from '../publications.repository';

const metadata = {
  contentLocale: Locale.EN,
  publicationType: ThreadPublicationType.ARTICLE,
};

function conflict(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('conflict', { code, clientVersion: 'test' });
}

describe('PublicationsRepository.createQueuedPublication under write conflicts (D-02)', () => {
  function build(upsert: ReturnType<typeof vi.fn>) {
    const transaction = {
      threadDeletedAccount: { findUnique: vi.fn().mockResolvedValue(null) },
      threadPublication: { upsert },
    };
    const prisma = {
      $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(transaction)),
    };
    return { repository: new PublicationsRepository(prisma as never), prisma };
  }

  const saved = { id: 'pub-1', slug: 'slug-1', ownerId: 'owner-1' };

  it('tries again after a serialization failure and then succeeds', async () => {
    const upsert = vi
      .fn()
      .mockRejectedValueOnce(conflict('P2034'))
      .mockRejectedValueOnce(conflict('P2034'))
      .mockResolvedValue(saved);
    const { repository, prisma } = build(upsert);

    await expect(repository.createQueuedPublication('owner-1', 'job-1', metadata)).resolves.toEqual(
      { id: 'pub-1', slug: 'slug-1', ownerId: 'owner-1' },
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('tries again after a unique-key race between two upserts of the same job', async () => {
    const upsert = vi.fn().mockRejectedValueOnce(conflict('P2002')).mockResolvedValue(saved);
    const { repository } = build(upsert);

    await expect(repository.createQueuedPublication('owner-1', 'job-1', metadata)).resolves.toEqual(
      { id: 'pub-1', slug: 'slug-1', ownerId: 'owner-1' },
    );
  });

  it('gives up with a retryable 503, never a 500, when every attempt conflicts', async () => {
    const upsert = vi.fn().mockRejectedValue(conflict('P2034'));
    const { repository, prisma } = build(upsert);

    await expect(
      repository.createQueuedPublication('owner-1', 'job-1', metadata),
    ).rejects.toMatchObject({ status: 503 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(4);
  });

  it('does not retry an error that is not a write conflict', async () => {
    const upsert = vi.fn().mockRejectedValue(new Error('connection lost'));
    const { repository, prisma } = build(upsert);

    await expect(repository.createQueuedPublication('owner-1', 'job-1', metadata)).rejects.toThrow(
      'connection lost',
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('stores the start identity so a repeated start can find its publication', async () => {
    const upsert = vi.fn().mockResolvedValue(saved);
    const { repository } = build(upsert);

    await repository.createQueuedPublication('owner-1', 'job-1', metadata, {
      keyHash: 'key-hash',
      requestHash: 'request-hash',
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          startKeyHash: 'key-hash',
          startRequestHash: 'request-hash',
        }),
      }),
    );
  });

  it('survives eight parallel starts whose first attempt all conflict', async () => {
    let call = 0;
    const upsert = vi.fn().mockImplementation(async () => {
      call += 1;
      if (call <= 8) throw conflict('P2034');
      return saved;
    });
    const { repository } = build(upsert);

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        repository.createQueuedPublication('owner-1', 'job-1', metadata),
      ),
    );

    expect(results.every((result) => result?.id === 'pub-1')).toBe(true);
  });
});

describe('PublicationsRepository start lookups', () => {
  it('finds the publication a start with this key made, for that owner only', async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue({ id: 'pub-1', generationJobId: 'job-1', startRequestHash: 'r' });
    const repository = new PublicationsRepository({ threadPublication: { findFirst } } as never);

    await expect(repository.findStartByKey('owner-1', 'key-hash')).resolves.toEqual({
      id: 'pub-1',
      generationJobId: 'job-1',
      requestHash: 'r',
    });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId: 'owner-1', startKeyHash: 'key-hash', generationJobId: { not: null } },
      }),
    );
  });

  it('answers null when there is none', async () => {
    const repository = new PublicationsRepository({
      threadPublication: { findFirst: vi.fn().mockResolvedValue(null) },
    } as never);

    await expect(repository.findStartByKey('owner-1', 'key-hash')).resolves.toBeNull();
  });

  it('lists the owner’s newest drafts that point at a job', async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: 'pub-2', generationJobId: 'job-2' },
      { id: 'pub-1', generationJobId: null },
    ]);
    const repository = new PublicationsRepository({ threadPublication: { findMany } } as never);

    await expect(repository.findDraftJobs('owner-1', 25)).resolves.toEqual([
      { publicationId: 'pub-2', jobId: 'job-2' },
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId: 'owner-1', status: 'DRAFT', generationJobId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
    );
  });

  it.each([
    ['a publication', { id: 'pub-1' }, null, true],
    ['an edit review', null, { id: 'rev-1' }, true],
    ['nothing', null, null, false],
  ])('knows a job is in use when %s points at it', async (_name, publication, revision, used) => {
    const repository = new PublicationsRepository({
      threadPublication: { findUnique: vi.fn().mockResolvedValue(publication) },
      threadPublicationRevision: { findFirst: vi.fn().mockResolvedValue(revision) },
    } as never);

    await expect(repository.isJobReferenced('job-1')).resolves.toBe(used);
  });
});

type Fake = {
  pubStatus: string;
  publishedAt: Date | null;
  revStatus: string;
  safety: string;
  indexEligible: boolean;
};

/**
 * A tiny database with the one behaviour the publish race depends on: an UPDATE of the revision
 * row waits for any other open transaction that already wrote it, as PostgreSQL does.
 */
function raceDatabase(initial: Partial<Fake>) {
  const db: Fake = {
    pubStatus: 'READY_FOR_REVIEW',
    publishedAt: null,
    revStatus: 'READY_FOR_REVIEW',
    safety: 'APPROVED',
    indexEligible: true,
    ...initial,
  };
  let rowLock: Promise<void> = Promise.resolve();
  const prisma = {
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      const row: { release?: () => void } = {};
      let held = false;
      const lock = async () => {
        if (held) return;
        const previous = rowLock;
        rowLock = new Promise<void>((resolve) => {
          row.release = resolve;
        });
        await previous;
        held = true;
      };
      const transaction = {
        threadPublication: {
          findFirst: (): Promise<unknown> => {
            const snapshot = {
              id: 'pub-1',
              slug: 'slug',
              status: db.pubStatus,
              publishedAt: db.publishedAt,
              revisions:
                (db.revStatus === 'READY_FOR_REVIEW' || db.revStatus === 'OWNER_APPROVED') &&
                db.safety === 'APPROVED' &&
                db.indexEligible
                  ? [
                      {
                        id: 'rev-1',
                        title: 'Title',
                        content: { markdown: '# Title' },
                        reviewStatus: db.revStatus,
                      },
                    ]
                  : [],
            };
            return Promise.resolve(snapshot);
          },
          updateMany: async ({
            where,
            data,
          }: {
            where: { status: { in: string[] } };
            data: { status: string; publishedAt: Date };
          }) => {
            await lock();
            if (!where.status.in.includes(db.pubStatus)) return { count: 0 };
            db.pubStatus = data.status;
            db.publishedAt = data.publishedAt;
            return { count: 1 };
          },
        },
        threadPublicationRevision: {
          updateMany: async ({
            where,
            data,
          }: {
            where: { reviewStatus?: string };
            data: { reviewStatus: string };
          }) => {
            await lock();
            if (where.reviewStatus && where.reviewStatus !== db.revStatus) return { count: 0 };
            db.revStatus = data.reviewStatus;
            return { count: 1 };
          },
        },
      };
      try {
        return await callback(transaction);
      } finally {
        row.release?.();
      }
    },
  };
  return { db, repository: new PublicationsRepository(prisma as never) };
}

describe('PublicationsRepository.publishReadyRevision (D7, D8)', () => {
  it('publishes a ready revision once and marks it approved', async () => {
    const { repository, db } = raceDatabase({});

    const outcome = await repository.publishReadyRevision('pub-1', 'owner-1');

    expect(outcome).toMatchObject({ kind: 'PUBLISHED', newlyPublished: true });
    expect(db).toMatchObject({ pubStatus: 'PUBLISHED', revStatus: 'OWNER_APPROVED' });
    expect(db.publishedAt).toBeInstanceOf(Date);
  });

  it('publishes an unpublished article again without a new review (D7)', async () => {
    const { repository, db } = raceDatabase({
      pubStatus: 'UNPUBLISHED',
      revStatus: 'OWNER_APPROVED',
    });

    const outcome = await repository.publishReadyRevision('pub-1', 'owner-1');

    expect(outcome).toMatchObject({ kind: 'PUBLISHED', newlyPublished: true });
    expect(db.pubStatus).toBe('PUBLISHED');
    expect(db.revStatus).toBe('OWNER_APPROVED');
  });

  it('answers a second publish of a live article with the article and no change', async () => {
    const { repository, db } = raceDatabase({});
    await repository.publishReadyRevision('pub-1', 'owner-1');
    const publishedAt = db.publishedAt;

    const again = await repository.publishReadyRevision('pub-1', 'owner-1');

    expect(again).toMatchObject({
      kind: 'PUBLISHED',
      newlyPublished: false,
      publication: { id: 'pub-1', publishedAt },
    });
    expect(db.publishedAt).toBe(publishedAt);
  });

  it('survives publish, unpublish, publish, publish', async () => {
    const { repository, db } = raceDatabase({});

    await repository.publishReadyRevision('pub-1', 'owner-1');
    db.pubStatus = 'UNPUBLISHED';
    db.publishedAt = null;
    const republished = await repository.publishReadyRevision('pub-1', 'owner-1');
    const repeated = await repository.publishReadyRevision('pub-1', 'owner-1');

    expect(republished).toMatchObject({ kind: 'PUBLISHED', newlyPublished: true });
    expect(repeated).toMatchObject({ kind: 'PUBLISHED', newlyPublished: false });
  });

  it('lets exactly one of two simultaneous publishes be the new one; the other gets the same article (D8)', async () => {
    const { repository, db } = raceDatabase({});

    const [first, second] = await Promise.all([
      repository.publishReadyRevision('pub-1', 'owner-1'),
      repository.publishReadyRevision('pub-1', 'owner-1'),
    ]);

    const outcomes = [first, second];
    expect(outcomes.every((outcome) => outcome?.kind === 'PUBLISHED')).toBe(true);
    expect(
      outcomes.filter((outcome) => outcome?.kind === 'PUBLISHED' && outcome.newlyPublished),
    ).toHaveLength(1);
    expect(db).toMatchObject({ pubStatus: 'PUBLISHED', revStatus: 'OWNER_APPROVED' });
  });

  it('keeps the row published and approved however many requests race', async () => {
    const { repository, db } = raceDatabase({});

    const outcomes = await Promise.all(
      Array.from({ length: 6 }, () => repository.publishReadyRevision('pub-1', 'owner-1')),
    );

    expect(outcomes.every((outcome) => outcome?.kind === 'PUBLISHED')).toBe(true);
    expect(
      outcomes.filter((outcome) => outcome?.kind === 'PUBLISHED' && outcome.newlyPublished),
    ).toHaveLength(1);
    expect(db).toMatchObject({ pubStatus: 'PUBLISHED', revStatus: 'OWNER_APPROVED' });
  });

  it('answers NOT_READY, not a 404, for a draft with no approved revision', async () => {
    const { repository } = raceDatabase({ pubStatus: 'DRAFT', revStatus: 'PENDING' });

    await expect(repository.publishReadyRevision('pub-1', 'owner-1')).resolves.toEqual({
      kind: 'NOT_READY',
    });
  });

  it('refuses a revision that is not safety approved or not index eligible', async () => {
    const unsafe = raceDatabase({ safety: 'REVIEW_REQUIRED' });
    const hidden = raceDatabase({ indexEligible: false });

    await expect(unsafe.repository.publishReadyRevision('pub-1', 'owner-1')).resolves.toEqual({
      kind: 'NOT_READY',
    });
    await expect(hidden.repository.publishReadyRevision('pub-1', 'owner-1')).resolves.toEqual({
      kind: 'NOT_READY',
    });
    expect(unsafe.db.pubStatus).toBe('READY_FOR_REVIEW');
  });

  it('never republishes a publication moderation revoked', async () => {
    const { repository, db } = raceDatabase({ pubStatus: 'REVOKED', revStatus: 'OWNER_APPROVED' });

    await expect(repository.publishReadyRevision('pub-1', 'owner-1')).resolves.toEqual({
      kind: 'REVOKED',
    });
    expect(db.pubStatus).toBe('REVOKED');
  });

  it('puts the revision back when the publication moved to a state that cannot publish', async () => {
    const { repository, db } = raceDatabase({});
    const original = db;
    // Revoked between the read and the write.
    const prismaLike = repository as unknown as {
      prisma: { $transaction: (cb: (tx: unknown) => Promise<unknown>) => Promise<unknown> };
    };
    const realTransaction = prismaLike.prisma.$transaction.bind(prismaLike.prisma);
    prismaLike.prisma.$transaction = (callback) =>
      realTransaction(async (tx) => {
        const result = callback(tx);
        original.pubStatus = 'REVOKED';
        return result;
      });

    await expect(repository.publishReadyRevision('pub-1', 'owner-1')).resolves.toEqual({
      kind: 'NOT_READY',
    });
    expect(db.revStatus).toBe('READY_FOR_REVIEW');
    expect(db.pubStatus).toBe('REVOKED');
  });
});
