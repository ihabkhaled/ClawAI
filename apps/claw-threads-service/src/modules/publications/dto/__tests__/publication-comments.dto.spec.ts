import { createPublicationCommentSchema } from '../create-publication-comment.dto';
import {
  commentIdParamSchema,
  listCommentRepliesQuerySchema,
  listPublicationCommentsQuerySchema,
} from '../list-publication-comments.dto';

describe('createPublicationCommentSchema', () => {
  it('keeps a top-level comment working and accepts an optional parent id', () => {
    expect(createPublicationCommentSchema.parse({ content: ' hi ' })).toEqual({ content: 'hi' });
    expect(createPublicationCommentSchema.parse({ content: 'hi', parentId: 'c1' })).toEqual({
      content: 'hi',
      parentId: 'c1',
    });
  });

  it('refuses an empty or oversized parent id, empty content and unstorable text', () => {
    expect(createPublicationCommentSchema.safeParse({ content: 'hi', parentId: '' }).success).toBe(
      false,
    );
    expect(
      createPublicationCommentSchema.safeParse({ content: 'hi', parentId: 'x'.repeat(65) }).success,
    ).toBe(false);
    expect(createPublicationCommentSchema.safeParse({ content: '   ' }).success).toBe(false);
    expect(createPublicationCommentSchema.safeParse({ content: 'a\u0000b' }).success).toBe(false);
    expect(createPublicationCommentSchema.safeParse({ content: 'a\uD800b' }).success).toBe(false);
  });

  it('accepts exactly 5000 characters and Arabic text', () => {
    expect(createPublicationCommentSchema.safeParse({ content: 'x'.repeat(5000) }).success).toBe(
      true,
    );
    expect(createPublicationCommentSchema.safeParse({ content: 'مرحبا @ada' }).success).toBe(true);
  });

  it('ignores a client-sent rootId instead of passing it on', () => {
    expect(
      createPublicationCommentSchema.parse({ content: 'hi', parentId: 'c1', rootId: 'evil' }),
    ).toEqual({ content: 'hi', parentId: 'c1' });
  });
});

describe('list comment queries', () => {
  it('defaults to page 1 of 20 and caps the page size at 50', () => {
    expect(listPublicationCommentsQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(listPublicationCommentsQuerySchema.parse({ page: '3', pageSize: '50' })).toEqual({
      page: 3,
      pageSize: 50,
    });
    expect(listPublicationCommentsQuerySchema.safeParse({ pageSize: '51' }).success).toBe(false);
    expect(listPublicationCommentsQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(listPublicationCommentsQuerySchema.safeParse({ page: 'abc' }).success).toBe(false);
  });

  it('defaults replies to 20 and caps them at 50, with a bounded cursor', () => {
    expect(listCommentRepliesQuerySchema.parse({})).toEqual({ limit: 20 });
    expect(listCommentRepliesQuerySchema.safeParse({ limit: '51' }).success).toBe(false);
    expect(listCommentRepliesQuerySchema.safeParse({ cursor: 'x'.repeat(201) }).success).toBe(
      false,
    );
    expect(listCommentRepliesQuerySchema.safeParse({ cursor: '' }).success).toBe(false);
  });

  it('bounds a comment id path parameter', () => {
    expect(commentIdParamSchema.safeParse('ckabc123').success).toBe(true);
    expect(commentIdParamSchema.safeParse('x'.repeat(65)).success).toBe(false);
  });
});
