import { UserNotificationKind } from '@claw/shared-types';

import type {
  CommunityActor,
  PublicationNotificationTarget,
} from '../../types/publication-comments.types';
import {
  commentExcerpt,
  commentLink,
  planChangeRequest,
  planCommentNotifications,
  planCommentReaction,
  planThreadReaction,
  singleLine,
} from '../community-notification.utility';

const actor: CommunityActor = { id: 'actor', displayName: 'Ada Lovelace', username: 'ada' };
const publication: PublicationNotificationTarget = {
  id: 'pub-1',
  slug: 'my-thread',
  ownerId: 'owner',
  title: 'My   Thread',
};

const base = {
  actor,
  publication,
  commentId: 'c1',
  content: 'Great point',
  replyToAuthorId: null,
  mentionedUserIds: [] as string[],
};

const kindsFor = (payloads: ReturnType<typeof planCommentNotifications>) =>
  payloads.map(({ userId, kind }) => `${userId}:${kind}`);

describe('planCommentNotifications', () => {
  it('tells the owner about a top-level comment, with the link, params and a stable key', () => {
    const [payload, ...rest] = planCommentNotifications(base);
    expect(rest).toEqual([]);
    expect(payload).toEqual({
      dedupeKey: 'comment:c1:THREAD_COMMENTED:owner',
      userId: 'owner',
      kind: UserNotificationKind.THREAD_COMMENTED,
      link: '/threads/my-thread#comment-c1',
      params: {
        actorName: 'Ada Lovelace',
        actorUsername: 'ada',
        title: 'My Thread',
        excerpt: 'Great point',
      },
    });
  });

  it('never notifies the actor about their own action', () => {
    expect(
      planCommentNotifications({
        ...base,
        actor: { ...actor, id: 'owner' },
        replyToAuthorId: 'owner',
        mentionedUserIds: ['owner'],
      }),
    ).toEqual([]);
  });

  it('tells the author of the replied-to comment and the owner, one each', () => {
    expect(kindsFor(planCommentNotifications({ ...base, replyToAuthorId: 'bob' }))).toEqual([
      'bob:THREAD_COMMENT_REPLIED',
      'owner:THREAD_COMMENTED',
    ]);
  });

  it('gives an owner who is also replied-to one notice, the reply notice', () => {
    expect(kindsFor(planCommentNotifications({ ...base, replyToAuthorId: 'owner' }))).toEqual([
      'owner:THREAD_COMMENT_REPLIED',
    ]);
  });

  it('gives a person who is replied-to and mentioned one notice, the reply notice', () => {
    expect(
      kindsFor(
        planCommentNotifications({ ...base, replyToAuthorId: 'bob', mentionedUserIds: ['bob'] }),
      ),
    ).toEqual(['bob:THREAD_COMMENT_REPLIED', 'owner:THREAD_COMMENTED']);
  });

  it('gives an owner who is mentioned one notice, the comment notice', () => {
    expect(kindsFor(planCommentNotifications({ ...base, mentionedUserIds: ['owner'] }))).toEqual([
      'owner:THREAD_COMMENTED',
    ]);
  });

  it('tells each mentioned person once', () => {
    expect(
      kindsFor(planCommentNotifications({ ...base, mentionedUserIds: ['carol', 'dave', 'carol'] })),
    ).toEqual(['owner:THREAD_COMMENTED', 'carol:THREAD_MENTIONED', 'dave:THREAD_MENTIONED']);
  });

  it('skips the owner when the account is gone', () => {
    expect(
      kindsFor(
        planCommentNotifications({
          ...base,
          publication: { ...publication, ownerId: null },
          mentionedUserIds: ['carol'],
        }),
      ),
    ).toEqual(['carol:THREAD_MENTIONED']);
  });

  it('gives every recipient a different key and params that stay within the auth limits', () => {
    const payloads = planCommentNotifications({
      ...base,
      actor: { ...actor, displayName: 'N'.repeat(500) },
      publication: { ...publication, title: 'T'.repeat(500) },
      content: 'x'.repeat(5000),
      replyToAuthorId: 'bob',
      mentionedUserIds: ['carol'],
    });
    expect(new Set(payloads.map(({ dedupeKey }) => dedupeKey)).size).toBe(payloads.length);
    for (const { params, dedupeKey, link } of payloads) {
      expect(Object.keys(params)).toHaveLength(4);
      for (const value of Object.values(params)) expect(value.length).toBeLessThanOrEqual(200);
      expect(dedupeKey.length).toBeLessThanOrEqual(200);
      expect(link.length).toBeLessThanOrEqual(300);
    }
  });
});

describe('planThreadReaction', () => {
  const input = { actor, publication, value: 'LIKE' as const, previous: null };

  it('notifies the owner of a like, with one key per actor and Thread', () => {
    expect(planThreadReaction(input)).toMatchObject({
      dedupeKey: 'thread-reacted:pub-1:actor',
      userId: 'owner',
      kind: UserNotificationKind.THREAD_REACTED,
      link: '/threads/my-thread',
      params: { actorName: 'Ada Lovelace', actorUsername: 'ada', title: 'My Thread', excerpt: '' },
    });
  });

  it('notifies a first dislike, but not a switch to dislike', () => {
    expect(planThreadReaction({ ...input, value: 'DISLIKE' })).not.toBeNull();
    expect(planThreadReaction({ ...input, value: 'DISLIKE', previous: 'LIKE' })).toBeNull();
  });

  it('notifies a like after a dislike, under the same key so it cannot repeat', () => {
    const first = planThreadReaction({ ...input, value: 'DISLIKE' });
    const later = planThreadReaction({ ...input, value: 'LIKE', previous: 'DISLIKE' });
    expect(later?.dedupeKey).toBe(first?.dedupeKey);
  });

  it('never notifies the owner about their own reaction or an ownerless Thread', () => {
    expect(planThreadReaction({ ...input, actor: { ...actor, id: 'owner' } })).toBeNull();
    expect(
      planThreadReaction({ ...input, publication: { ...publication, ownerId: null } }),
    ).toBeNull();
  });
});

describe('planCommentReaction', () => {
  const input = {
    actor,
    publication,
    comment: { id: 'c1', authorId: 'bob', content: 'Nice\npoint' },
    value: 'LIKE' as const,
  };

  it('notifies the comment author of a like, linking to the comment', () => {
    expect(planCommentReaction(input)).toMatchObject({
      dedupeKey: 'comment-reacted:c1:actor',
      userId: 'bob',
      kind: UserNotificationKind.THREAD_COMMENT_REACTED,
      link: '/threads/my-thread#comment-c1',
      params: { excerpt: 'Nice point' },
    });
  });

  it('never announces a dislike, a self-like or an anonymised author', () => {
    expect(planCommentReaction({ ...input, value: 'DISLIKE' as never })).toBeNull();
    expect(
      planCommentReaction({ ...input, comment: { ...input.comment, authorId: 'actor' } }),
    ).toBeNull();
    expect(
      planCommentReaction({ ...input, comment: { ...input.comment, authorId: null } }),
    ).toBeNull();
  });
});

describe('planChangeRequest', () => {
  it('notifies the owner once per request', () => {
    expect(
      planChangeRequest({ actor, publication, requestId: 'req-1', suggestion: 'Add a source' }),
    ).toMatchObject({
      dedupeKey: 'change-requested:req-1',
      userId: 'owner',
      kind: UserNotificationKind.THREAD_CHANGE_REQUESTED,
      params: { excerpt: 'Add a source' },
    });
  });

  it('does not notify the owner about their own request or an ownerless Thread', () => {
    const request = { requestId: 'req-1', suggestion: 's' };
    expect(
      planChangeRequest({ actor: { ...actor, id: 'owner' }, publication, ...request }),
    ).toBeNull();
    expect(
      planChangeRequest({ actor, publication: { ...publication, ownerId: null }, ...request }),
    ).toBeNull();
  });
});

describe('text helpers', () => {
  it('cuts an excerpt at 120 characters on a character boundary and flattens lines', () => {
    expect(commentExcerpt('a\n\n  b')).toBe('a b');
    const long = commentExcerpt('😀'.repeat(300));
    expect([...long]).toHaveLength(120);
    expect(long.endsWith('…')).toBe(true);
  });

  it('keeps Arabic text intact', () => {
    expect(commentExcerpt('مرحبا بالعالم')).toBe('مرحبا بالعالم');
  });

  it('builds a safe anchored link', () => {
    expect(commentLink('a b', 'c/1')).toBe('/threads/a%20b#comment-c%2F1');
  });

  it('singleLine leaves short text alone', () => {
    expect(singleLine('  hi  ', 10)).toBe('hi');
  });
});
