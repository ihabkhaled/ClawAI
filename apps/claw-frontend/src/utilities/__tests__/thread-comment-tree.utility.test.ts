import { describe, expect, it } from 'vitest';

import { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import { threadCommentFixture } from '@/test/fixtures/thread-comment.fixture';
import type { ThreadCommentsData } from '@/types/thread-community.types';
import {
  applyReaction,
  commentIdFromHash,
  findComment,
  insertComment,
  mergeReplies,
  nextReaction,
  remainingReplies,
  updateComment,
} from '@/utilities/thread-comment-tree.utility';

const LIKE = ThreadPublicationReaction.Like;
const DISLIKE = ThreadPublicationReaction.Dislike;

function data(): ThreadCommentsData {
  const reply = threadCommentFixture({
    id: 'r1',
    parentId: 'c1',
    rootId: 'c1',
    createdAt: '2026-10-05T13:00:00.000Z',
  });
  return {
    pages: [
      {
        items: [
          threadCommentFixture({ id: 'c1', replyCount: 3, replies: [reply], hasMoreReplies: true }),
          threadCommentFixture({ id: 'c2' }),
        ],
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
      },
    ],
    pageParams: [1],
  };
}

describe('reply grouping', () => {
  it('lists every reply of a root once, oldest first, whatever the chain depth', () => {
    const early = threadCommentFixture({ id: 'a', createdAt: '2026-10-05T10:00:00.000Z' });
    const late = threadCommentFixture({ id: 'b', createdAt: '2026-10-05T11:00:00.000Z' });
    expect(mergeReplies([late], [early, late]).map((reply) => reply.id)).toEqual(['a', 'b']);
  });

  it('puts a reply to a reply under the same root', () => {
    const created = threadCommentFixture({
      id: 'r2',
      parentId: 'r1',
      rootId: 'c1',
      createdAt: '2026-10-05T14:00:00.000Z',
    });
    const next = insertComment(data(), created);
    const root = findComment(next, 'c1');
    expect(root?.replies.map((reply) => reply.id)).toEqual(['r1', 'r2']);
    expect(root?.replyCount).toBe(4);
  });

  it('puts a new top-level comment first and leaves the input untouched', () => {
    const before = data();
    const next = insertComment(before, threadCommentFixture({ id: 'c3' }));
    expect(next.pages[0]?.items.map((item) => item.id)).toEqual(['c3', 'c1', 'c2']);
    expect(before.pages[0]?.items).toHaveLength(2);
  });

  it('counts the replies still to load', () => {
    expect(remainingReplies(findComment(data(), 'c1')!)).toBe(2);
    expect(remainingReplies(findComment(data(), 'c2')!)).toBe(0);
  });
});

describe('reaction arithmetic', () => {
  it('adds a like and swaps a like for a dislike', () => {
    const none = { likes: 2, dislikes: 1, viewerReaction: null };
    expect(applyReaction(none, LIKE)).toEqual({ likes: 3, dislikes: 1, viewerReaction: LIKE });
    expect(applyReaction({ likes: 3, dislikes: 1, viewerReaction: LIKE }, DISLIKE)).toEqual({
      likes: 2,
      dislikes: 2,
      viewerReaction: DISLIKE,
    });
  });

  it('clears a reaction and never goes below zero', () => {
    expect(applyReaction({ likes: 0, dislikes: 0, viewerReaction: LIKE }, null)).toEqual({
      likes: 0,
      dislikes: 0,
      viewerReaction: null,
    });
  });

  it('asks for the same reaction twice as a clear', () => {
    expect(nextReaction(LIKE, LIKE)).toBeNull();
    expect(nextReaction(LIKE, DISLIKE)).toBe(DISLIKE);
    expect(nextReaction(null, LIKE)).toBe(LIKE);
  });

  it('updates a reply deep in a root without mutating the cache', () => {
    const before = data();
    const next = updateComment(before, 'r1', (found) => ({ ...found, likes: 9 }));
    expect(findComment(next, 'r1')?.likes).toBe(9);
    expect(findComment(before, 'r1')?.likes).toBe(0);
  });
});

describe('commentIdFromHash', () => {
  it('reads #comment-<id> and nothing else', () => {
    expect(commentIdFromHash('#comment-abc-123')).toBe('abc-123');
    expect(commentIdFromHash('#other')).toBeNull();
    expect(commentIdFromHash('')).toBeNull();
    expect(commentIdFromHash('#comment-<script>')).toBeNull();
  });
});
