import { PublicationsRepository } from '../publications.repository';

describe('PublicationsRepository community data', () => {
  it('upserts one reaction per user and returns aggregate counts', async () => {
    const transaction = {
      threadPublication: { findFirst: vi.fn().mockResolvedValue({ id: 'publication-1' }) },
      threadPublicationReaction: {
        upsert: vi.fn(),
        count: vi.fn().mockResolvedValueOnce(4).mockResolvedValueOnce(2),
      },
    };
    const prisma = {
      $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(transaction)),
    };
    const repository = new PublicationsRepository(prisma as never);

    await expect(
      repository.setPublicReaction('public-slug', 'user-1', { value: 'LIKE' }),
    ).resolves.toEqual({ likes: 4, dislikes: 2, viewerReaction: 'LIKE' });
    expect(transaction.threadPublicationReaction.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { publicationId_userId: { publicationId: 'publication-1', userId: 'user-1' } },
      }),
    );
  });

  it('removes only the current reader reaction', async () => {
    const transaction = {
      threadPublication: { findFirst: vi.fn().mockResolvedValue({ id: 'publication-1' }) },
      threadPublicationReaction: {
        deleteMany: vi.fn(),
        count: vi.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(1),
      },
    };
    const prisma = {
      $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(transaction)),
    };
    const repository = new PublicationsRepository(prisma as never);

    await expect(repository.removePublicReaction('public-slug', 'user-1')).resolves.toEqual({
      likes: 3,
      dislikes: 1,
      viewerReaction: null,
    });
    expect(transaction.threadPublicationReaction.deleteMany).toHaveBeenCalledWith({
      where: { publicationId: 'publication-1', userId: 'user-1' },
    });
  });

  it('filters owner change decisions by both publication owner and pending state', async () => {
    const prisma = {
      threadPublicationChangeRequest: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const repository = new PublicationsRepository(prisma as never);

    await expect(
      repository.resolveOwnedChangeRequest(
        'publication-1',
        'owner-1',
        'request-1',
        { status: 'REJECTED' },
        null,
      ),
    ).resolves.toBe(true);
    expect(prisma.threadPublicationChangeRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'request-1',
          publicationId: 'publication-1',
          status: 'PENDING',
          publication: { ownerId: 'owner-1' },
        }),
      }),
    );
  });

  describe('createPublicChangeRequest limits', () => {
    function create(counts: { person: number; thread: number }, ownerId = 'owner-1') {
      const transaction = {
        threadPublication: {
          findFirst: vi.fn().mockResolvedValue({ id: 'publication-1', ownerId }),
        },
        $queryRaw: vi.fn().mockResolvedValue([]),
        threadPublicationChangeRequest: {
          count: vi
            .fn()
            .mockImplementation(({ where }: { where: { requesterId?: string } }) =>
              Promise.resolve(where.requesterId ? counts.person : counts.thread),
            ),
          create: vi.fn().mockResolvedValue({ id: 'request-1', status: 'PENDING' }),
        },
      };
      const prisma = {
        $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(transaction)),
      };
      return { transaction, repository: new PublicationsRepository(prisma as never) };
    }

    it('saves a suggestion under the publication row lock', async () => {
      const { transaction, repository } = create({ person: 0, thread: 0 });
      await expect(
        repository.createPublicChangeRequest('slug', 'reader-1', { suggestion: 'Add a source' }),
      ).resolves.toEqual({ kind: 'CREATED', request: { id: 'request-1', status: 'PENDING' } });
      expect(transaction.$queryRaw).toHaveBeenCalledTimes(1);
      expect(transaction.threadPublicationChangeRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            publicationId: 'publication-1',
            requesterId: 'reader-1',
            suggestion: 'Add a source',
          },
        }),
      );
    });

    it('refuses the owner suggesting to their own Thread, before any count or write', async () => {
      const { transaction, repository } = create({ person: 0, thread: 0 });
      await expect(
        repository.createPublicChangeRequest('slug', 'owner-1', { suggestion: 'x' }),
      ).resolves.toEqual({ kind: 'OWN_THREAD' });
      expect(transaction.threadPublicationChangeRequest.count).not.toHaveBeenCalled();
      expect(transaction.threadPublicationChangeRequest.create).not.toHaveBeenCalled();
    });

    it('refuses a fourth pending suggestion from one person on one Thread', async () => {
      const { transaction, repository } = create({ person: 3, thread: 3 });
      await expect(
        repository.createPublicChangeRequest('slug', 'reader-1', { suggestion: 'x' }),
      ).resolves.toEqual({ kind: 'USER_LIMIT' });
      expect(transaction.threadPublicationChangeRequest.create).not.toHaveBeenCalled();
    });

    it('allows the third pending one', async () => {
      const { repository } = create({ person: 2, thread: 10 });
      await expect(
        repository.createPublicChangeRequest('slug', 'reader-1', { suggestion: 'x' }),
      ).resolves.toMatchObject({ kind: 'CREATED' });
    });

    it('refuses a 51st pending suggestion on one Thread', async () => {
      const { transaction, repository } = create({ person: 0, thread: 50 });
      await expect(
        repository.createPublicChangeRequest('slug', 'reader-1', { suggestion: 'x' }),
      ).resolves.toEqual({ kind: 'THREAD_LIMIT' });
      expect(transaction.threadPublicationChangeRequest.create).not.toHaveBeenCalled();
    });

    it('counts only PENDING suggestions toward both limits', async () => {
      const { transaction, repository } = create({ person: 0, thread: 0 });
      await repository.createPublicChangeRequest('slug', 'reader-1', { suggestion: 'x' });
      const wheres = transaction.threadPublicationChangeRequest.count.mock.calls.map(
        (call: Array<{ where: { status: string } }>) => call[0]?.where.status,
      );
      expect(wheres).toEqual(['PENDING', 'PENDING']);
    });

    it('answers NOT_FOUND for a Thread that is not public', async () => {
      const { transaction, repository } = create({ person: 0, thread: 0 });
      transaction.threadPublication.findFirst.mockResolvedValue(null);
      await expect(
        repository.createPublicChangeRequest('slug', 'reader-1', { suggestion: 'x' }),
      ).resolves.toEqual({ kind: 'NOT_FOUND' });
    });
  });

  it('lists the owner their Threads with how many suggestions are waiting', async () => {
    const prisma = {
      threadPublication: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'pub-1',
            status: 'PUBLISHED',
            slug: 's',
            updatedAt: new Date(),
            _count: { changeRequests: 3 },
            revisions: [],
          },
        ]),
      },
    };
    const repository = new PublicationsRepository(prisma as never);

    const [item] = await repository.findOwnedPublications('owner-1');

    expect(item).toMatchObject({ id: 'pub-1', pendingChangeRequests: 3 });
    expect(item).not.toHaveProperty('_count');
    const select = prisma.threadPublication.findMany.mock.calls[0]?.[0].select;
    expect(select._count).toEqual({
      select: { changeRequests: { where: { status: 'PENDING' } } },
    });
  });

  it('omits reporter identities from moderator report rows', async () => {
    const prisma = {
      threadPublicationReport: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const repository = new PublicationsRepository(prisma as never);

    await repository.findOpenModerationReports();

    const query = prisma.threadPublicationReport.findMany.mock.calls[0]?.[0];
    expect(query.select).not.toHaveProperty('reporterId');
    expect(query.where.status).toBe('OPEN');
  });
});
