import { PublicationCommentStatus } from '../../../../generated/prisma';
import { MAX_REPLIES_PER_ROOT } from '../../constants/publication-comments.constants';
import { PublicationCommentsRepository } from '../publication-comments.repository';

const publicWhere = (slug: string) =>
  expect.objectContaining({
    slug,
    status: 'PUBLISHED',
    revisions: {
      some: { reviewStatus: 'OWNER_APPROVED', safetyStatus: 'APPROVED', indexEligible: true },
    },
  });

const publicationRow = {
  id: 'pub-1',
  slug: 'a-slug',
  ownerId: 'owner',
  revisions: [{ title: 'A Title' }],
};

const stored = (overrides: Record<string, unknown> = {}) => ({
  id: 'c-new',
  parentId: null,
  rootId: null,
  authorId: 'user-1',
  replyToUserId: null,
  content: 'Hello',
  status: 'VISIBLE',
  createdAt: new Date('2026-10-14T10:00:00Z'),
  mentions: [],
  parent: null,
  ...overrides,
});

function createTx() {
  return {
    threadPublication: { findFirst: vi.fn().mockResolvedValue(publicationRow) },
    threadPublicationComment: {
      findFirst: vi.fn(),
      create: vi.fn().mockResolvedValue(stored()),
      count: vi.fn().mockResolvedValue(0),
    },
    threadPublicationCommentReaction: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  };
}

function createRepository(tx = createTx(), extra: Record<string, unknown> = {}) {
  const prisma = {
    $transaction: vi.fn((callback: (client: unknown) => unknown) => callback(tx)),
    ...extra,
  };
  return { tx, prisma, repository: new PublicationCommentsRepository(prisma as never) };
}

const target = (overrides: Record<string, unknown> = {}) => ({
  id: 'c-top',
  publicationId: 'pub-1',
  rootId: null,
  authorId: 'author-1',
  status: PublicationCommentStatus.VISIBLE,
  ...overrides,
});

describe('PublicationCommentsRepository.createComment', () => {
  it('creates a top-level comment with its resolved mentions and no parent or root', async () => {
    const { tx, repository } = createRepository();
    const outcome = await repository.createComment('a-slug', 'user-1', { content: 'Hello @ada' }, [
      { userId: 'u-ada', username: 'ada' },
    ]);

    expect(tx.threadPublication.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: publicWhere('a-slug') }),
    );
    expect(tx.threadPublicationComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          publicationId: 'pub-1',
          authorId: 'user-1',
          content: 'Hello @ada',
          parentId: null,
          rootId: null,
          replyToUserId: null,
          mentions: { create: [{ userId: 'u-ada', username: 'ada' }] },
        },
      }),
    );
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({
      kind: 'CREATED',
      replyToAuthorId: null,
      publication: { id: 'pub-1', slug: 'a-slug', ownerId: 'owner', title: 'A Title' },
    });
  });

  it('derives the root of a reply to a reply on the server and locks that root', async () => {
    const { tx, repository } = createRepository();
    tx.threadPublicationComment.findFirst.mockResolvedValue(
      target({ id: 'reply-9', rootId: 'c-top', authorId: 'author-2' }),
    );

    const outcome = await repository.createComment(
      'a-slug',
      'user-1',
      { content: 'Nested', parentId: 'reply-9' },
      [],
    );

    expect(tx.threadPublicationComment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'reply-9', publicationId: 'pub-1' } }),
    );
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.threadPublicationComment.count).toHaveBeenCalledWith({ where: { rootId: 'c-top' } });
    expect(tx.threadPublicationComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parentId: 'reply-9',
          rootId: 'c-top',
          replyToUserId: 'author-2',
        }),
      }),
    );
    expect(outcome).toMatchObject({ kind: 'CREATED', replyToAuthorId: 'author-2' });
  });

  it('makes a reply to a top-level comment its own root', async () => {
    const { tx, repository } = createRepository();
    tx.threadPublicationComment.findFirst.mockResolvedValue(target());
    await repository.createComment('a-slug', 'user-1', { content: 'x', parentId: 'c-top' }, []);
    expect(tx.threadPublicationComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ parentId: 'c-top', rootId: 'c-top' }),
      }),
    );
  });

  it('rejects a parent from another publication, a hidden parent and an unknown parent alike', async () => {
    for (const found of [
      null,
      target({ publicationId: 'pub-2' }),
      target({ status: PublicationCommentStatus.HIDDEN }),
      target({ status: PublicationCommentStatus.DELETED }),
    ]) {
      const { tx, repository } = createRepository();
      tx.threadPublicationComment.findFirst.mockResolvedValue(found);
      await expect(
        repository.createComment('a-slug', 'user-1', { content: 'x', parentId: 'p' }, []),
      ).resolves.toEqual({ kind: 'PARENT_NOT_FOUND' });
      expect(tx.threadPublicationComment.create).not.toHaveBeenCalled();
    }
  });

  it('refuses a reply once the conversation holds the maximum number of replies', async () => {
    const { tx, repository } = createRepository();
    tx.threadPublicationComment.findFirst.mockResolvedValue(target());
    tx.threadPublicationComment.count.mockResolvedValue(MAX_REPLIES_PER_ROOT);
    await expect(
      repository.createComment('a-slug', 'user-1', { content: 'x', parentId: 'c-top' }, []),
    ).resolves.toEqual({ kind: 'REPLY_LIMIT' });
    expect(tx.threadPublicationComment.create).not.toHaveBeenCalled();
  });

  it('accepts the reply that fills the last slot', async () => {
    const { tx, repository } = createRepository();
    tx.threadPublicationComment.findFirst.mockResolvedValue(target());
    tx.threadPublicationComment.count.mockResolvedValue(MAX_REPLIES_PER_ROOT - 1);
    await expect(
      repository.createComment('a-slug', 'user-1', { content: 'x', parentId: 'c-top' }, []),
    ).resolves.toMatchObject({ kind: 'CREATED' });
  });

  it('adds nothing to a publication that is not public', async () => {
    const { tx, repository } = createRepository();
    tx.threadPublication.findFirst.mockResolvedValue(null);
    await expect(
      repository.createComment('hidden', 'user-1', { content: 'x' }, []),
    ).resolves.toEqual({ kind: 'PUBLICATION_NOT_FOUND' });
    expect(tx.threadPublicationComment.create).not.toHaveBeenCalled();
  });
});

describe('PublicationCommentsRepository comment votes', () => {
  function votable() {
    const made = createRepository();
    made.tx.threadPublicationComment.findFirst.mockResolvedValue({
      id: 'c1',
      authorId: 'author-1',
      content: 'Nice',
    });
    return made;
  }

  it('upserts one vote per person and reads the totals in the same transaction', async () => {
    const { tx, repository, prisma } = votable();
    tx.threadPublicationCommentReaction.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2);

    const outcome = await repository.setCommentReaction('a-slug', 'c1', 'user-1', 'LIKE');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.threadPublicationCommentReaction.upsert).toHaveBeenCalledWith({
      where: { commentId_userId: { commentId: 'c1', userId: 'user-1' } },
      create: { commentId: 'c1', userId: 'user-1', value: 'LIKE' },
      update: { value: 'LIKE' },
    });
    expect(outcome).toMatchObject({
      summary: { likes: 4, dislikes: 2, viewerReaction: 'LIKE' },
      comment: { id: 'c1', authorId: 'author-1' },
      publication: { id: 'pub-1' },
    });
  });

  it('only votes on a visible comment of this publication', async () => {
    const { tx, repository } = votable();
    await repository.setCommentReaction('a-slug', 'c1', 'user-1', 'DISLIKE');
    expect(tx.threadPublicationComment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1', publicationId: 'pub-1', status: 'VISIBLE' },
      }),
    );
  });

  it('answers null for an unknown or hidden comment and an unpublished Thread', async () => {
    const hidden = votable();
    hidden.tx.threadPublicationComment.findFirst.mockResolvedValue(null);
    await expect(
      hidden.repository.setCommentReaction('a-slug', 'c1', 'user-1', 'LIKE'),
    ).resolves.toBeNull();
    expect(hidden.tx.threadPublicationCommentReaction.upsert).not.toHaveBeenCalled();

    const unpublished = votable();
    unpublished.tx.threadPublication.findFirst.mockResolvedValue(null);
    await expect(
      unpublished.repository.removeCommentReaction('hidden', 'c1', 'user-1'),
    ).resolves.toBeNull();
  });

  it('removes only the caller vote and reports no viewer reaction', async () => {
    const { tx, repository } = votable();
    tx.threadPublicationCommentReaction.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    const outcome = await repository.removeCommentReaction('a-slug', 'c1', 'user-1');
    expect(tx.threadPublicationCommentReaction.deleteMany).toHaveBeenCalledWith({
      where: { commentId: 'c1', userId: 'user-1' },
    });
    expect(outcome?.summary).toEqual({ likes: 1, dislikes: 0, viewerReaction: null });
  });
});

describe('PublicationCommentsRepository reads', () => {
  function readable(rows: unknown[] = []) {
    const prisma = {
      threadPublication: { findFirst: vi.fn().mockResolvedValue({ id: 'pub-1' }) },
      threadPublicationComment: {
        count: vi.fn().mockResolvedValue(rows.length),
        findMany: vi.fn().mockResolvedValue(rows),
        findFirst: vi.fn().mockResolvedValue({ id: 'c-top' }),
        groupBy: vi.fn().mockResolvedValue([{ rootId: 'c-top', _count: { _all: 2 } }]),
      },
      threadPublicationCommentReaction: {
        groupBy: vi.fn().mockResolvedValue([
          { commentId: 'c-top', value: 'LIKE', _count: { _all: 3 } },
          { commentId: 'c-top', value: 'DISLIKE', _count: { _all: 1 } },
        ]),
        findMany: vi.fn().mockResolvedValue([{ commentId: 'c-top', value: 'LIKE' }]),
      },
    };
    return { prisma, repository: new PublicationCommentsRepository(prisma as never) };
  }

  it('pages top-level comments newest first, keeping a removed one only while it has visible replies', async () => {
    const { prisma, repository } = readable([{ ...stored({ id: 'c-top' }), replies: [] }]);
    const page = await repository.findPage('a-slug', 3, 20, 'viewer');

    const query = prisma.threadPublicationComment.findMany.mock.calls[0]?.[0];
    expect(query.where).toEqual({
      publicationId: 'pub-1',
      rootId: null,
      OR: [{ status: 'VISIBLE' }, { replies: { some: { status: 'VISIBLE' } } }],
    });
    expect(query.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    expect(query.skip).toBe(40);
    expect(query.take).toBe(20);
    expect(query.select.replies.where).toEqual({ status: 'VISIBLE' });
    expect(query.select.replies.orderBy).toEqual([{ createdAt: 'asc' }, { id: 'asc' }]);
    expect(query.select.replies.take).toBe(4);
    expect(page?.tallies.get('c-top')).toEqual({ likes: 3, dislikes: 1, viewerReaction: 'LIKE' });
    expect(page?.replyCounts.get('c-top')).toBe(2);
  });

  it('is null for a publication that is not public and skips the viewer join for a guest', async () => {
    const { prisma, repository } = readable();
    prisma.threadPublication.findFirst.mockResolvedValue(null);
    await expect(repository.findPage('hidden', 1, 20, undefined)).resolves.toBeNull();

    const guest = readable([{ ...stored({ id: 'c-top' }), replies: [] }]);
    await guest.repository.findPage('a-slug', 1, 20, undefined);
    expect(guest.prisma.threadPublicationCommentReaction.findMany).not.toHaveBeenCalled();
  });

  it('pages replies oldest first after the cursor and reports whether more remain', async () => {
    const rows = [stored({ id: 'r1' }), stored({ id: 'r2' }), stored({ id: 'r3' })];
    const { prisma, repository } = readable(rows);
    const cursor = { createdAt: new Date('2026-10-14T09:00:00Z'), id: 'r0' };

    const page = await repository.findReplies('a-slug', 'c-top', cursor, 2, undefined);

    const query = prisma.threadPublicationComment.findMany.mock.calls[0]?.[0];
    expect(query.where).toEqual({
      rootId: 'c-top',
      status: 'VISIBLE',
      OR: [
        { createdAt: { gt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { gt: 'r0' } },
      ],
    });
    expect(query.take).toBe(3);
    expect(page?.rows.map(({ id }) => id)).toEqual(['r1', 'r2']);
    expect(page?.hasMore).toBe(true);
  });

  it('has no more replies when the page is not full', async () => {
    const { repository } = readable([stored({ id: 'r1' })]);
    const page = await repository.findReplies('a-slug', 'c-top', null, 2, undefined);
    expect(page?.hasMore).toBe(false);
  });

  it('is null when the conversation is not a top-level comment of this publication', async () => {
    const { prisma, repository } = readable();
    prisma.threadPublicationComment.findFirst.mockResolvedValue(null);
    await expect(
      repository.findReplies('a-slug', 'other-pub-comment', null, 20, undefined),
    ).resolves.toBeNull();
    expect(prisma.threadPublicationComment.findFirst).toHaveBeenCalledWith({
      where: { id: 'other-pub-comment', publicationId: 'pub-1', rootId: null },
      select: { id: true },
    });
  });
});
