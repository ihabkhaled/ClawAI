import { z } from 'zod';

import {
  COMMENTS_DEFAULT_PAGE_SIZE,
  COMMENTS_MAX_PAGE_SIZE,
  REPLIES_DEFAULT_PAGE_SIZE,
  REPLIES_MAX_PAGE_SIZE,
} from '../constants/publication-comments.constants';

/** Top-level comments, newest first, page by page. */
export const listPublicationCommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(COMMENTS_MAX_PAGE_SIZE)
    .default(COMMENTS_DEFAULT_PAGE_SIZE),
});
export type ListPublicationCommentsQuery = z.infer<typeof listPublicationCommentsQuerySchema>;

/** Replies of one conversation, oldest first, after an opaque cursor. */
export const listCommentRepliesQuerySchema = z.object({
  cursor: z.string().min(1).max(200).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(REPLIES_MAX_PAGE_SIZE)
    .default(REPLIES_DEFAULT_PAGE_SIZE),
});
export type ListCommentRepliesQuery = z.infer<typeof listCommentRepliesQuerySchema>;

/** A comment id in a path: opaque, bounded, so a hostile value never reaches the database. */
export const commentIdParamSchema = z.string().min(1).max(64);
