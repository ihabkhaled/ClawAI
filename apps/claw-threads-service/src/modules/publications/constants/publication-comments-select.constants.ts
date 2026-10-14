import { type Prisma, PublicationCommentStatus } from '../../../generated/prisma';

/** The columns a comment view needs. Ids of people stay server-side. */
export const COMMENT_SELECT = {
  id: true,
  parentId: true,
  rootId: true,
  authorId: true,
  replyToUserId: true,
  content: true,
  status: true,
  createdAt: true,
  mentions: { select: { username: true }, orderBy: { username: 'asc' } },
  parent: { select: { status: true } },
} as const satisfies Prisma.ThreadPublicationCommentSelect;

/** Replies read oldest first; the id breaks ties so the cursor is stable. */
export const OLDEST_FIRST = [{ createdAt: 'asc' }, { id: 'asc' }] as const;

export const VISIBLE_COMMENT = PublicationCommentStatus.VISIBLE;
