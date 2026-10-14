import { PublicationCommentStatus } from '../../../../generated/prisma';
import type { ReplyTarget } from '../../types/publication-comments.types';
import { placeReply } from '../comment-placement.utility';

const target = (overrides: Partial<ReplyTarget> = {}): ReplyTarget => ({
  id: 'c1',
  publicationId: 'pub-1',
  rootId: null,
  authorId: 'author-1',
  status: PublicationCommentStatus.VISIBLE,
  ...overrides,
});

describe('placeReply', () => {
  it('makes a reply to a top-level comment point at it as both parent and root', () => {
    expect(placeReply(target(), 'pub-1')).toEqual({
      parentId: 'c1',
      rootId: 'c1',
      replyToUserId: 'author-1',
    });
  });

  it('flattens a reply to a reply: the parent is the target, the root is the top-level comment', () => {
    expect(placeReply(target({ id: 'r7', rootId: 'c1', authorId: 'author-2' }), 'pub-1')).toEqual({
      parentId: 'r7',
      rootId: 'c1',
      replyToUserId: 'author-2',
    });
  });

  it('refuses a missing target', () => {
    expect(placeReply(null, 'pub-1')).toBeNull();
  });

  it('refuses a target of another publication', () => {
    expect(placeReply(target({ publicationId: 'pub-2' }), 'pub-1')).toBeNull();
  });

  it('refuses a hidden or deleted target', () => {
    expect(placeReply(target({ status: PublicationCommentStatus.HIDDEN }), 'pub-1')).toBeNull();
    expect(placeReply(target({ status: PublicationCommentStatus.DELETED }), 'pub-1')).toBeNull();
  });

  it('keeps a null reply target for an anonymised author', () => {
    expect(placeReply(target({ authorId: null }), 'pub-1')?.replyToUserId).toBeNull();
  });
});
