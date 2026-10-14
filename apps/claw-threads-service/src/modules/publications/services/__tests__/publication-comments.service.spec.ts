import { HttpException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { PublicationCommentStatus } from '../../../../generated/prisma';
import type { CommentRecord } from '../../types/publication-comments.types';
import { encodeReplyCursor } from '../../utilities/reply-cursor.utility';
import { PublicationCommentsService } from '../publication-comments.service';

const ada = { username: 'ada', displayName: 'Ada Lovelace' };
const bob = { username: 'bob', displayName: 'Bob' };

const record = (overrides: Partial<CommentRecord> = {}): CommentRecord => ({
  id: 'c1',
  parentId: null,
  rootId: null,
  authorId: 'u1',
  replyToUserId: null,
  content: 'Hello',
  status: PublicationCommentStatus.VISIBLE,
  createdAt: new Date('2026-10-14T10:00:00Z'),
  mentions: [],
  parent: null,
  ...overrides,
});

const publication = { id: 'pub-1', slug: 's', ownerId: 'owner', title: 'T' };

function create(options: { limit?: unknown; counts?: unknown; notifier?: unknown } = {}) {
  const comments = {
    findPage: vi.fn(),
    findReplies: vi.fn(),
    findCommentLocation: vi.fn(),
    createComment: vi.fn(),
    setCommentReaction: vi.fn(),
    removeCommentReaction: vi.fn(),
  };
  const identity = {
    resolveMany: vi.fn().mockResolvedValue(
      new Map([
        ['u1', ada],
        ['u2', bob],
      ]),
    ),
    resolveByUsername: vi.fn().mockResolvedValue(null),
  };
  const notifier = options.notifier ?? {
    commentCreated: vi.fn().mockResolvedValue(undefined),
    commentReacted: vi.fn().mockResolvedValue(undefined),
  };
  const service = new PublicationCommentsService(
    comments as never,
    identity as never,
    notifier as never,
    options.limit as never,
    options.counts as never,
  );
  return {
    service,
    comments,
    identity,
    notifier: notifier as Record<string, ReturnType<typeof vi.fn>>,
  };
}

describe('PublicationCommentsService.list', () => {
  const query = { page: 1, pageSize: 20 };

  it('names authors, nests the first replies and flags more replies', async () => {
    const { service, comments, identity } = create();
    const replies = [1, 2, 3, 4].map((n) =>
      record({
        id: `r${String(n)}`,
        parentId: 'c1',
        rootId: 'c1',
        authorId: 'u2',
        replyToUserId: 'u1',
        parent: { status: PublicationCommentStatus.VISIBLE },
        createdAt: new Date(`2026-10-14T10:0${String(n)}:00Z`),
      }),
    );
    comments.findPage.mockResolvedValue({
      total: 45,
      roots: [{ ...record(), replies }],
      tallies: new Map([['c1', { likes: 2, dislikes: 0, viewerReaction: 'LIKE' }]]),
      replyCounts: new Map([['c1', 4]]),
    });

    const page = await service.list('s', query, 'viewer-1');

    expect(comments.findPage).toHaveBeenCalledWith('s', 1, 20, 'viewer-1');
    expect(identity.resolveMany).toHaveBeenCalledTimes(1);
    expect(page).toMatchObject({ total: 45, page: 1, pageSize: 20, totalPages: 3 });
    const [root] = page.items;
    expect(root).toMatchObject({
      id: 'c1',
      author: ada,
      likes: 2,
      viewerReaction: 'LIKE',
      replyCount: 4,
      hasMoreReplies: true,
    });
    expect(root?.replies.map(({ id }) => id)).toEqual(['r1', 'r2', 'r3']);
    expect(root?.replies[0]).toMatchObject({ author: bob, replyTo: ada });
    expect(root?.nextReplyCursor).toBe(encodeReplyCursor(replies[2] as never));
  });

  it('degrades names to null when the identity lookup returns nothing', async () => {
    const { service, comments, identity } = create();
    identity.resolveMany.mockResolvedValue(new Map());
    comments.findPage.mockResolvedValue({
      total: 1,
      roots: [{ ...record(), replies: [] }],
      tallies: new Map(),
      replyCounts: new Map(),
    });
    const page = await service.list('s', query);
    expect(page.items[0]?.author).toBeNull();
    expect(page.items[0]?.content).toBe('Hello');
  });

  it('shows the placeholder for a removed top-level comment that still has replies', async () => {
    const { service, comments } = create();
    comments.findPage.mockResolvedValue({
      total: 1,
      roots: [
        {
          ...record({ status: PublicationCommentStatus.HIDDEN, content: 'secret' }),
          replies: [record({ id: 'r1', parentId: 'c1', rootId: 'c1', authorId: 'u2' })],
        },
      ],
      tallies: new Map(),
      replyCounts: new Map([['c1', 1]]),
    });
    const [root] = (await service.list('s', query)).items;
    expect(root).toMatchObject({
      removed: true,
      content: '[removed]',
      author: null,
      replyCount: 1,
    });
    expect(root?.replies).toHaveLength(1);
  });

  it('is 404 for an unknown slug and an empty page for an unexpected data error', async () => {
    const { service, comments } = create();
    comments.findPage.mockResolvedValue(null);
    await expect(service.list('nope', query)).rejects.toBeInstanceOf(NotFoundException);
    comments.findPage.mockRejectedValue(new Error('db down'));
    await expect(service.list('s', query)).resolves.toEqual({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      commentTotal: 0,
      totalPages: 0,
    });
    comments.findPage.mockRejectedValue(new NotFoundException('x'));
    await expect(service.list('s', query)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PublicationCommentsService.listReplies', () => {
  it('returns replies oldest first with a cursor to continue', async () => {
    const { service, comments } = create();
    const rows = [
      record({ id: 'r1', parentId: 'c1', rootId: 'c1' }),
      record({ id: 'r2', parentId: 'r1', rootId: 'c1', authorId: 'u2' }),
    ];
    comments.findReplies.mockResolvedValue({ rows, hasMore: true, tallies: new Map() });

    const page = await service.listReplies('s', 'c1', { limit: 2 }, 'viewer-1');

    expect(comments.findReplies).toHaveBeenCalledWith('s', 'c1', null, 2, 'viewer-1');
    expect(page.items.map(({ id }) => id)).toEqual(['r1', 'r2']);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe(encodeReplyCursor(rows[1] as never));
  });

  it('decodes the cursor and ends with a null cursor on the last page', async () => {
    const { service, comments } = create();
    const cursor = encodeReplyCursor({ createdAt: new Date('2026-10-14T10:00:00Z'), id: 'r0' });
    comments.findReplies.mockResolvedValue({ rows: [], hasMore: false, tallies: new Map() });
    const page = await service.listReplies('s', 'c1', { limit: 20, cursor }, undefined);
    expect(comments.findReplies.mock.calls[0]?.[2]).toEqual({
      createdAt: new Date('2026-10-14T10:00:00Z'),
      id: 'r0',
    });
    expect(page).toEqual({ items: [], nextCursor: null, hasMore: false });
  });

  it('rejects a tampered cursor with 400 before reading anything', async () => {
    const { service, comments } = create();
    await expect(
      service.listReplies('s', 'c1', { limit: 20, cursor: '!!' }, undefined),
    ).rejects.toThrow('Invalid replies cursor');
    expect(comments.findReplies).not.toHaveBeenCalled();
  });

  it('is 404 when the conversation is not in this publication', async () => {
    const { service, comments } = create();
    comments.findReplies.mockResolvedValue(null);
    await expect(service.listReplies('s', 'x', { limit: 20 }, undefined)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('PublicationCommentsService.add', () => {
  const created = (extra: Record<string, unknown> = {}) => ({
    kind: 'CREATED',
    comment: record({ id: 'c-new', content: 'Hi @bob', mentions: [{ username: 'bob' }] }),
    publication,
    replyToAuthorId: null,
    ...extra,
  });

  it('checks the rate limit before anything is written', async () => {
    const limit = { assertAllowed: vi.fn().mockRejectedValue(new HttpException('slow down', 429)) };
    const { service, comments } = create({ limit });
    await expect(service.add('s', 'u1', { content: 'hi' })).rejects.toBeInstanceOf(HttpException);
    expect(comments.createComment).not.toHaveBeenCalled();
  });

  it('resolves mentions to real accounts, never the author, once each, and stores them', async () => {
    const { service, comments, identity } = create();
    identity.resolveByUsername.mockImplementation((name: string) =>
      Promise.resolve(
        (
          {
            bob: { id: 'u2', username: 'Bob', displayName: 'Bob' },
            ada: { id: 'u1', username: 'ada', displayName: 'Ada' },
            bobby: { id: 'u2', username: 'Bob', displayName: 'Bob' },
          } as Record<string, unknown>
        )[name] ?? null,
      ),
    );
    comments.createComment.mockResolvedValue(created());

    await service.add('s', 'u1', { content: 'hi @bob @ada @ghost @bobby' });

    expect(comments.createComment).toHaveBeenCalledWith(
      's',
      'u1',
      { content: 'hi @bob @ada @ghost @bobby' },
      [{ userId: 'u2', username: 'Bob' }],
    );
  });

  it('passes the parent id through for the repository to validate and returns the new comment view', async () => {
    const { service, comments } = create();
    comments.createComment.mockResolvedValue(created({ replyToAuthorId: 'u2' }));
    const view = await service.add('s', 'u1', { content: 'Hi @bob', parentId: 'c0' });
    expect(comments.createComment.mock.calls[0]?.[2]).toEqual({
      content: 'Hi @bob',
      parentId: 'c0',
    });
    expect(view).toMatchObject({ id: 'c-new', author: ada, mentions: [{ username: 'bob' }] });
  });

  it('maps a missing publication and a missing parent to 404 and the reply cap to 422', async () => {
    const { service, comments } = create();
    comments.createComment.mockResolvedValueOnce({ kind: 'PUBLICATION_NOT_FOUND' });
    await expect(service.add('s', 'u1', { content: 'x' })).rejects.toThrow('Publication not found');
    comments.createComment.mockResolvedValueOnce({ kind: 'PARENT_NOT_FOUND' });
    await expect(service.add('s', 'u1', { content: 'x', parentId: 'p' })).rejects.toThrow(
      'Comment not found',
    );
    comments.createComment.mockResolvedValueOnce({ kind: 'REPLY_LIMIT' });
    await expect(service.add('s', 'u1', { content: 'x', parentId: 'p' })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('recounts the Board on every create, replies included, and survives a counter failure', async () => {
    const counts = { commentsChanged: vi.fn().mockRejectedValue(new Error('down')) };
    const { service, comments } = create({ counts });
    comments.createComment.mockResolvedValue(created());
    await expect(service.add('s', 'u1', { content: 'x' })).resolves.toMatchObject({ id: 'c-new' });
    comments.createComment.mockResolvedValue(created({ replyToAuthorId: 'u2' }));
    await service.add('s', 'u1', { content: 'y', parentId: 'c0' });
    expect(counts.commentsChanged).toHaveBeenCalledTimes(2);
    expect(counts.commentsChanged).toHaveBeenCalledWith('s');
  });

  it('hands the notifier the actor, the reply target and the resolved mentions', async () => {
    const { service, comments, identity, notifier } = create();
    identity.resolveByUsername.mockResolvedValue({ id: 'u2', username: 'bob', displayName: 'Bob' });
    comments.createComment.mockResolvedValue(created({ replyToAuthorId: 'u3' }));
    await service.add('s', 'u1', { content: 'Hi @bob', parentId: 'c0' });
    expect(notifier['commentCreated']).toHaveBeenCalledWith({
      actorId: 'u1',
      publication,
      commentId: 'c-new',
      content: 'Hi @bob',
      replyToAuthorId: 'u3',
      mentionedUserIds: ['u2'],
    });
  });

  it('still returns the saved comment when the identity lookups find nobody', async () => {
    const { service, comments, identity } = create();
    identity.resolveMany.mockResolvedValue(new Map());
    comments.createComment.mockResolvedValue(created());
    await expect(service.add('s', 'u1', { content: 'x' })).resolves.toMatchObject({ author: null });
  });
});

describe('PublicationCommentsService votes', () => {
  const outcome = {
    summary: { likes: 1, dislikes: 0, viewerReaction: 'LIKE' },
    publication,
    comment: { id: 'c1', authorId: 'u2', content: 'x' },
  };

  it('sets a vote, returns the totals and notifies once for the like', async () => {
    const { service, comments, notifier } = create();
    comments.setCommentReaction.mockResolvedValue(outcome);
    await expect(service.react('s', 'c1', 'u1', { value: 'LIKE' })).resolves.toEqual(
      outcome.summary,
    );
    expect(comments.setCommentReaction).toHaveBeenCalledWith('s', 'c1', 'u1', 'LIKE');
    expect(notifier['commentReacted']).toHaveBeenCalledWith(outcome, 'u1', 'LIKE');
  });

  it('removes a vote without notifying', async () => {
    const { service, comments, notifier } = create();
    comments.removeCommentReaction.mockResolvedValue({
      ...outcome,
      summary: { likes: 0, dislikes: 0, viewerReaction: null },
    });
    await expect(service.unreact('s', 'c1', 'u1')).resolves.toEqual({
      likes: 0,
      dislikes: 0,
      viewerReaction: null,
    });
    expect(notifier['commentReacted']).not.toHaveBeenCalled();
  });

  it('is 404 for an unknown, hidden or foreign comment', async () => {
    const { service, comments } = create();
    comments.setCommentReaction.mockResolvedValue(null);
    comments.removeCommentReaction.mockResolvedValue(null);
    await expect(service.react('s', 'x', 'u1', { value: 'LIKE' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.unreact('s', 'x', 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PublicationCommentsService.locate', () => {
  it('returns the conversation root of a reply', async () => {
    const { service, comments } = create();
    comments.findCommentLocation.mockResolvedValue({ id: 'r9', rootId: 'c1' });
    await expect(service.locate('s', 'r9')).resolves.toEqual({ id: 'r9', rootId: 'c1' });
  });

  it('throws NotFound when the comment is gone', async () => {
    const { service, comments } = create();
    comments.findCommentLocation.mockResolvedValue(null);
    await expect(service.locate('s', 'zz')).rejects.toBeInstanceOf(NotFoundException);
  });
});
