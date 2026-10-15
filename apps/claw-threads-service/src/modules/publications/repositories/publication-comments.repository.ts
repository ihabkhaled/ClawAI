import { Injectable } from '@nestjs/common';

import { type Prisma, PublicationReactionValue } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  MAX_REPLIES_PER_ROOT,
  REPLY_PREVIEW_COUNT,
} from '../constants/publication-comments.constants';
import type {
  CommentDbClient,
  CommentPageRecords,
  CommentReactionOutcome,
  CommentReactionSummary,
  CommentReactionValue,
  CommentTally,
  CreateCommentOutcome,
  PublicationNotificationTarget,
  ReplyCursor,
  ReplyPageRecords,
} from '../types/publication-comments.types';
import {
  COMMENT_SELECT,
  OLDEST_FIRST,
  VISIBLE_COMMENT as VISIBLE,
} from '../constants/publication-comments-select.constants';
import { readablePublicationTitle } from '../utilities/publication-readable-title.utility';
import { PUBLIC_REVISION_WHERE } from '../constants/public-revision.constants';
import { placeReply } from '../utilities/comment-placement.utility';
import { publicPublicationWhere } from '../utilities/public-publication-where.utility';

/**
 * Comment threads, comment votes and mentions (ADR-179). Every read and write goes through the one
 * public-publication predicate, so a draft, unpublished or revoked Thread has no comments to read or
 * add. Vote totals and reply counts are computed from the rows, never stored, so they cannot drift.
 */
@Injectable()
export class PublicationCommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The publication a notification is about; null when it is not public. */
  async findPublicationTarget(slug: string): Promise<PublicationNotificationTarget | null> {
    return this.targetOf(this.prisma, slug);
  }

  /**
   * One page of top-level comments, newest first, each with its first replies (oldest first). A
   * hidden or removed top-level comment is kept only while it has a visible reply.
   */
  async findPage(
    slug: string,
    page: number,
    pageSize: number,
    viewerId: string | undefined,
  ): Promise<CommentPageRecords | null> {
    const publication = await this.prisma.threadPublication.findFirst({
      where: publicPublicationWhere(slug),
      select: { id: true },
    });
    if (!publication) return null;
    const where: Prisma.ThreadPublicationCommentWhereInput = {
      publicationId: publication.id,
      rootId: null,
      OR: [{ status: VISIBLE }, { replies: { some: { status: VISIBLE } } }],
    };
    const [total, commentTotal, roots] = await Promise.all([
      this.prisma.threadPublicationComment.count({ where }),
      this.prisma.threadPublicationComment.count({
        where: { publicationId: publication.id, status: VISIBLE },
      }),
      this.prisma.threadPublicationComment.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          ...COMMENT_SELECT,
          replies: {
            where: { status: VISIBLE },
            orderBy: [...OLDEST_FIRST],
            take: REPLY_PREVIEW_COUNT + 1,
            select: COMMENT_SELECT,
          },
        },
      }),
    ]);
    const ids = roots.flatMap((root) => [root.id, ...root.replies.map(({ id }) => id)]);
    const [tallies, replyCounts] = await Promise.all([
      this.tallies(ids, viewerId),
      this.replyCounts(roots.map(({ id }) => id)),
    ]);
    return { total, commentTotal, roots, tallies, replyCounts };
  }

  /** Where a visible comment lives: its own id and the root of its conversation. null when it is gone. */
  async findCommentLocation(
    slug: string,
    commentId: string,
  ): Promise<{ id: string; rootId: string } | null> {
    const publication = await this.prisma.threadPublication.findFirst({
      where: publicPublicationWhere(slug),
      select: { id: true },
    });
    if (!publication) return null;
    const comment = await this.prisma.threadPublicationComment.findFirst({
      where: { id: commentId, publicationId: publication.id, status: VISIBLE },
      select: { id: true, rootId: true },
    });
    return comment ? { id: comment.id, rootId: comment.rootId ?? comment.id } : null;
  }

  /** Replies of one conversation after `cursor`, oldest first. null when the conversation is not here. */
  async findReplies(
    slug: string,
    rootId: string,
    cursor: ReplyCursor | null,
    limit: number,
    viewerId: string | undefined,
  ): Promise<ReplyPageRecords | null> {
    const publication = await this.prisma.threadPublication.findFirst({
      where: publicPublicationWhere(slug),
      select: { id: true },
    });
    if (!publication) return null;
    const root = await this.prisma.threadPublicationComment.findFirst({
      where: { id: rootId, publicationId: publication.id, rootId: null },
      select: { id: true },
    });
    if (!root) return null;
    const rows = await this.prisma.threadPublicationComment.findMany({
      where: {
        rootId,
        status: VISIBLE,
        ...(cursor
          ? {
              OR: [
                { createdAt: { gt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { gt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [...OLDEST_FIRST],
      take: limit + 1,
      select: COMMENT_SELECT,
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      rows: page,
      hasMore,
      tallies: await this.tallies(
        page.map(({ id }) => id),
        viewerId,
      ),
    };
  }

  /**
   * Adds a comment or a reply. The reply's parent must be a VISIBLE comment of this publication; its
   * root is derived from that parent, never from the client. The conversation's root row is locked
   * first so concurrent replies see the real count and the per-root cap holds.
   */
  async createComment(
    slug: string,
    authorId: string,
    input: { content: string; parentId?: string | undefined },
    mentions: ReadonlyArray<{ userId: string; username: string }>,
  ): Promise<CreateCommentOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const target = await this.targetOf(tx, slug);
      if (!target) return { kind: 'PUBLICATION_NOT_FOUND' };

      let placement: ReturnType<typeof placeReply> = null;
      if (input.parentId !== undefined) {
        const parent = await tx.threadPublicationComment.findFirst({
          where: { id: input.parentId, publicationId: target.id },
          select: { id: true, publicationId: true, rootId: true, authorId: true, status: true },
        });
        placement = placeReply(parent, target.id);
        if (!placement) return { kind: 'PARENT_NOT_FOUND' };
        await tx.$queryRaw`SELECT id FROM thread_publication_comments WHERE id = ${placement.rootId} FOR UPDATE`;
        const replies = await tx.threadPublicationComment.count({
          where: { rootId: placement.rootId },
        });
        if (replies >= MAX_REPLIES_PER_ROOT) return { kind: 'REPLY_LIMIT' };
      }

      const comment = await tx.threadPublicationComment.create({
        data: {
          publicationId: target.id,
          authorId,
          content: input.content,
          parentId: placement?.parentId ?? null,
          rootId: placement?.rootId ?? null,
          replyToUserId: placement?.replyToUserId ?? null,
          mentions: {
            create: mentions.map(({ userId, username }) => ({ userId, username })),
          },
        },
        select: COMMENT_SELECT,
      });
      return {
        kind: 'CREATED',
        comment,
        publication: target,
        replyToAuthorId: placement?.replyToUserId ?? null,
      };
    });
  }

  /** One vote per person per comment, changed in place. Totals are read in the same transaction. */
  async setCommentReaction(
    slug: string,
    commentId: string,
    userId: string,
    value: CommentReactionValue,
  ): Promise<CommentReactionOutcome | null> {
    return this.prisma.$transaction(async (tx) => {
      const found = await this.findVoteTarget(tx, slug, commentId);
      if (!found) return null;
      await tx.threadPublicationCommentReaction.upsert({
        where: { commentId_userId: { commentId, userId } },
        create: { commentId, userId, value },
        update: { value },
      });
      return { ...found, summary: await this.summary(tx, commentId, value) };
    });
  }

  async removeCommentReaction(
    slug: string,
    commentId: string,
    userId: string,
  ): Promise<CommentReactionOutcome | null> {
    return this.prisma.$transaction(async (tx) => {
      const found = await this.findVoteTarget(tx, slug, commentId);
      if (!found) return null;
      await tx.threadPublicationCommentReaction.deleteMany({ where: { commentId, userId } });
      return { ...found, summary: await this.summary(tx, commentId, null) };
    });
  }

  private async findVoteTarget(
    tx: CommentDbClient,
    slug: string,
    commentId: string,
  ): Promise<Omit<CommentReactionOutcome, 'summary'> | null> {
    const publication = await this.targetOf(tx, slug);
    if (!publication) return null;
    const comment = await tx.threadPublicationComment.findFirst({
      where: { id: commentId, publicationId: publication.id, status: VISIBLE },
      select: { id: true, authorId: true, content: true },
    });
    return comment ? { publication, comment } : null;
  }

  private async summary(
    db: CommentDbClient,
    commentId: string,
    viewerReaction: CommentReactionValue | null,
  ): Promise<CommentReactionSummary> {
    const [likes, dislikes] = await Promise.all([
      db.threadPublicationCommentReaction.count({
        where: { commentId, value: PublicationReactionValue.LIKE },
      }),
      db.threadPublicationCommentReaction.count({
        where: { commentId, value: PublicationReactionValue.DISLIKE },
      }),
    ]);
    return { likes, dislikes, viewerReaction };
  }

  private async targetOf(
    db: Pick<CommentDbClient, 'threadPublication'>,
    slug: string,
  ): Promise<PublicationNotificationTarget | null> {
    const publication = await db.threadPublication.findFirst({
      where: publicPublicationWhere(slug),
      select: {
        id: true,
        slug: true,
        ownerId: true,
        revisions: {
          where: PUBLIC_REVISION_WHERE,
          orderBy: { revision: 'desc' },
          take: 1,
          select: { title: true, content: true },
        },
      },
    });
    return publication
      ? {
          id: publication.id,
          slug: publication.slug,
          ownerId: publication.ownerId,
          title: readablePublicationTitle(
            publication.revisions[0]?.title ?? '',
            publication.revisions[0]?.content,
          ),
        }
      : null;
  }

  private async tallies(
    commentIds: readonly string[],
    viewerId: string | undefined,
  ): Promise<Map<string, CommentTally>> {
    const result = new Map<string, CommentTally>();
    if (commentIds.length === 0) return result;
    const [grouped, mine] = await Promise.all([
      this.prisma.threadPublicationCommentReaction.groupBy({
        by: ['commentId', 'value'],
        where: { commentId: { in: [...commentIds] } },
        _count: { _all: true },
      }),
      viewerId === undefined
        ? Promise.resolve([])
        : this.prisma.threadPublicationCommentReaction.findMany({
            where: { commentId: { in: [...commentIds] }, userId: viewerId },
            select: { commentId: true, value: true },
          }),
    ]);
    for (const id of commentIds) result.set(id, { likes: 0, dislikes: 0, viewerReaction: null });
    for (const row of grouped) {
      const tally = result.get(row.commentId);
      if (!tally) continue;
      if (row.value === PublicationReactionValue.LIKE) tally.likes = row._count._all;
      else tally.dislikes = row._count._all;
    }
    for (const row of mine) {
      const tally = result.get(row.commentId);
      if (tally) tally.viewerReaction = row.value;
    }
    return result;
  }

  private async replyCounts(rootIds: readonly string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (rootIds.length === 0) return counts;
    const grouped = await this.prisma.threadPublicationComment.groupBy({
      by: ['rootId'],
      where: { rootId: { in: [...rootIds] }, status: VISIBLE },
      _count: { _all: true },
    });
    for (const row of grouped) {
      if (row.rootId !== null) counts.set(row.rootId, row._count._all);
    }
    return counts;
  }
}
