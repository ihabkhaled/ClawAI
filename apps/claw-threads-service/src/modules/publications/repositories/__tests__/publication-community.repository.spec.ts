import { PublicationsRepository } from '../publications.repository';

function publicWhere(slug: string) {
  return expect.objectContaining({
    slug,
    status: 'PUBLISHED',
    revisions: {
      some: {
        reviewStatus: 'OWNER_APPROVED',
        safetyStatus: 'APPROVED',
        indexEligible: true,
      },
    },
  });
}

describe('PublicationsRepository community data', () => {
  it('creates bounded public comments without returning author identity', async () => {
    const transaction = {
      threadPublication: { findFirst: vi.fn().mockResolvedValue({ id: 'publication-1' }) },
      threadPublicationComment: {
        create: vi.fn().mockResolvedValue({
          id: 'comment-1',
          content: 'Helpful detail',
          createdAt: new Date('2026-10-05T00:00:00Z'),
        }),
      },
    };
    const prisma = {
      $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(transaction)),
    };
    const repository = new PublicationsRepository(prisma as never);

    const result = await repository.createPublicComment('public-slug', 'user-1', {
      content: 'Helpful detail',
    });

    expect(transaction.threadPublication.findFirst).toHaveBeenCalledWith({
      where: publicWhere('public-slug'),
      select: { id: true },
    });
    expect(transaction.threadPublicationComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { publicationId: 'publication-1', authorId: 'user-1', content: 'Helpful detail' },
      }),
    );
    expect(result).not.toHaveProperty('authorId');
  });

  it('does not create comments for an unpublished or ineligible publication', async () => {
    const transaction = {
      threadPublication: { findFirst: vi.fn().mockResolvedValue(null) },
      threadPublicationComment: { create: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(transaction)),
    };
    const repository = new PublicationsRepository(prisma as never);

    await expect(
      repository.createPublicComment('hidden-slug', 'user-1', { content: 'Hello' }),
    ).resolves.toBeNull();
    expect(transaction.threadPublicationComment.create).not.toHaveBeenCalled();
  });

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
