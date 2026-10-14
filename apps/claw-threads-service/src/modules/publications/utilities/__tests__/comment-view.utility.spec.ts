import { PublicationCommentStatus } from '../../../../generated/prisma';
import type { CommentLookup, CommentRecord } from '../../types/publication-comments.types';
import { recordPersonIds, toCommentView } from '../comment-view.utility';

const ada = { username: 'ada', displayName: 'Ada Lovelace' };
const bob = { username: 'bob', displayName: 'bob' };

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

const lookup = (overrides: Partial<CommentLookup> = {}): CommentLookup => ({
  authors: new Map([
    ['u1', ada],
    ['u2', bob],
  ]),
  tallies: new Map([['c1', { likes: 3, dislikes: 1, viewerReaction: 'LIKE' as const }]]),
  replyCounts: new Map([['c1', 4]]),
  ...overrides,
});

describe('toCommentView', () => {
  it('shapes a visible comment with author, votes, viewer reaction and reply count', () => {
    const view = toCommentView(record({ mentions: [{ username: 'bob' }] }), lookup());
    expect(view).toMatchObject({
      id: 'c1',
      content: 'Hello',
      removed: false,
      author: ada,
      replyTo: null,
      mentions: [{ username: 'bob' }],
      likes: 3,
      dislikes: 1,
      viewerReaction: 'LIKE',
      replyCount: 4,
      replies: [],
      hasMoreReplies: false,
      nextReplyCursor: null,
    });
  });

  it('never carries an author id, an email or the reply target id', () => {
    const view = toCommentView(record({ replyToUserId: 'u2' }), lookup());
    const keys = Object.keys(view);
    expect(keys).not.toContain('authorId');
    expect(keys).not.toContain('replyToUserId');
    expect(JSON.stringify(view)).not.toContain('u1');
    expect(JSON.stringify(view)).not.toContain('u2');
  });

  it('shows author null for an anonymised or unknown author', () => {
    expect(toCommentView(record({ authorId: null }), lookup()).author).toBeNull();
    expect(toCommentView(record({ authorId: 'ghost' }), lookup()).author).toBeNull();
  });

  it('names whom a reply answers while the comment replied to is visible', () => {
    const reply = record({
      id: 'r1',
      parentId: 'c1',
      rootId: 'c1',
      replyToUserId: 'u2',
      parent: { status: PublicationCommentStatus.VISIBLE },
    });
    expect(toCommentView(reply, lookup()).replyTo).toEqual(bob);
  });

  it('drops replyTo when the comment replied to was hidden or removed', () => {
    const reply = record({
      id: 'r1',
      parentId: 'c1',
      rootId: 'c1',
      replyToUserId: 'u2',
      parent: { status: PublicationCommentStatus.HIDDEN },
    });
    expect(toCommentView(reply, lookup()).replyTo).toBeNull();
  });

  it('replaces a hidden or deleted comment with the placeholder and shows nothing of it', () => {
    for (const status of [PublicationCommentStatus.HIDDEN, PublicationCommentStatus.DELETED]) {
      const view = toCommentView(
        record({ status, content: 'secret', mentions: [{ username: 'bob' }] }),
        lookup(),
      );
      expect(view).toMatchObject({
        removed: true,
        content: '[removed]',
        author: null,
        mentions: [],
        likes: 0,
        dislikes: 0,
        viewerReaction: null,
        replyCount: 4,
      });
      expect(JSON.stringify(view)).not.toContain('secret');
    }
  });

  it('embeds replies and a continuation cursor only when more remain', () => {
    const reply = toCommentView(record({ id: 'r1', parentId: 'c1', rootId: 'c1' }), lookup());
    const more = toCommentView(record(), lookup(), { replies: [reply], hasMoreReplies: true });
    expect(more.replies).toHaveLength(1);
    expect(more.hasMoreReplies).toBe(true);
    expect(more.nextReplyCursor).toEqual(expect.any(String));
    const done = toCommentView(record(), lookup(), { replies: [reply], hasMoreReplies: false });
    expect(done.nextReplyCursor).toBeNull();
  });
});

describe('recordPersonIds', () => {
  it('lists author and reply target of a visible comment only', () => {
    expect(recordPersonIds(record({ replyToUserId: 'u2' }))).toEqual(['u1', 'u2']);
    expect(recordPersonIds(record({ authorId: null }))).toEqual([]);
    expect(
      recordPersonIds(record({ status: PublicationCommentStatus.HIDDEN, replyToUserId: 'u2' })),
    ).toEqual([]);
  });
});
