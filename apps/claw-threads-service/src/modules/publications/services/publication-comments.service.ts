import {
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';

import { AuthorIdentityService } from '../../author-identity/services/author-identity.service';
import {
  BOARD_COUNTS_PORT,
  type BoardCountsPort,
} from '../../publication-community/ports/board-counts.port';
import { CommentRateLimitService } from '../../publication-community/services/comment-rate-limit.service';
import {
  COMMENT_PARENT_NOT_FOUND_MESSAGE,
  COMMENT_REPLY_LIMIT_ERROR_CODE,
  REPLY_PREVIEW_COUNT,
} from '../constants/publication-comments.constants';
import type { CreatePublicationCommentDto } from '../dto/create-publication-comment.dto';
import type {
  ListCommentRepliesQuery,
  ListPublicationCommentsQuery,
} from '../dto/list-publication-comments.dto';
import type { SetPublicationReactionDto } from '../dto/set-publication-reaction.dto';
import { PublicationCommentsRepository } from '../repositories/publication-comments.repository';
import type {
  CommentLookup,
  CommentReactionSummary,
  CommentRecord,
  PublicComment,
  PublicCommentPage,
  PublicReplyPage,
} from '../types/publication-comments.types';
import { emptyCommentPage } from '../utilities/comment-page.utility';
import { errorText } from '../utilities/error-text.utility';
import { parseMentionUsernames } from '../utilities/comment-mention.utility';
import { recordPersonIds, toCommentView } from '../utilities/comment-view.utility';
import { decodeReplyCursor, encodeReplyCursor } from '../utilities/reply-cursor.utility';
import { CommunityNotificationService } from './community-notification.service';

/**
 * Threaded comments: paging, replies, mentions, votes (ADR-179). Reads degrade instead of failing
 * (an unexpected data error returns an empty page, an unknown slug stays 404). A write that saved
 * never fails on a notification, a name lookup or a Board counter.
 */
@Injectable()
export class PublicationCommentsService {
  private readonly logger = new Logger(PublicationCommentsService.name);

  constructor(
    private readonly comments: PublicationCommentsRepository,
    private readonly identity: AuthorIdentityService,
    @Optional() private readonly notifier?: CommunityNotificationService,
    @Optional() private readonly commentRateLimit?: CommentRateLimitService,
    @Optional() @Inject(BOARD_COUNTS_PORT) private readonly boardCounts?: BoardCountsPort,
  ) {}

  async list(
    slug: string,
    query: ListPublicationCommentsQuery,
    viewerId?: string,
  ): Promise<PublicCommentPage> {
    let data;
    try {
      data = await this.comments.findPage(slug, query.page, query.pageSize, viewerId);
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Comment read failed: ${errorText(error)}`);
      return emptyCommentPage(query);
    }
    if (!data) throw new NotFoundException('Publication not found');
    const everyRecord = data.roots.flatMap((root) => [root, ...root.replies]);
    const lookup = await this.lookupFor(everyRecord, data.tallies, data.replyCounts);
    const items = data.roots.map((root) =>
      toCommentView(root, lookup, {
        replies: root.replies
          .slice(0, REPLY_PREVIEW_COUNT)
          .map((reply) => toCommentView(reply, lookup)),
        hasMoreReplies: root.replies.length > REPLY_PREVIEW_COUNT,
      }),
    );
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total: data.total,
      commentTotal: data.commentTotal,
      totalPages: Math.ceil(data.total / query.pageSize),
    };
  }

  async listReplies(
    slug: string,
    rootId: string,
    query: ListCommentRepliesQuery,
    viewerId?: string,
  ): Promise<PublicReplyPage> {
    const cursor = query.cursor === undefined ? null : decodeReplyCursor(query.cursor);
    let data;
    try {
      data = await this.comments.findReplies(slug, rootId, cursor, query.limit, viewerId);
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Reply read failed: ${errorText(error)}`);
      return { items: [], nextCursor: null, hasMore: false };
    }
    if (!data) throw new NotFoundException('Comment not found');
    const lookup = await this.lookupFor(data.rows, data.tallies, new Map());
    const last = data.rows.at(-1);
    return {
      items: data.rows.map((row) => toCommentView(row, lookup)),
      nextCursor: data.hasMore && last ? encodeReplyCursor(last) : null,
      hasMore: data.hasMore,
    };
  }

  async locate(slug: string, commentId: string): Promise<{ id: string; rootId: string }> {
    const location = await this.comments.findCommentLocation(slug, commentId);
    if (!location) throw new NotFoundException('Comment not found');
    return location;
  }

  async add(
    slug: string,
    userId: string,
    input: CreatePublicationCommentDto,
  ): Promise<PublicComment> {
    await this.commentRateLimit?.assertAllowed(userId);
    const mentions = await this.resolveMentions(input.content, userId);
    const outcome = await this.comments.createComment(slug, userId, input, mentions);
    if (outcome.kind === 'PUBLICATION_NOT_FOUND') {
      throw new NotFoundException('Publication not found');
    }
    if (outcome.kind === 'PARENT_NOT_FOUND') {
      throw new NotFoundException(COMMENT_PARENT_NOT_FOUND_MESSAGE);
    }
    if (outcome.kind === 'REPLY_LIMIT') {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: COMMENT_REPLY_LIMIT_ERROR_CODE,
        message: 'This conversation has reached its reply limit',
      });
    }
    await this.refreshBoardCounts(slug);
    await this.notifier?.commentCreated({
      actorId: userId,
      publication: outcome.publication,
      commentId: outcome.comment.id,
      content: outcome.comment.content,
      replyToAuthorId: outcome.replyToAuthorId,
      mentionedUserIds: mentions.map(({ userId: mentioned }) => mentioned),
    });
    const lookup = await this.lookupFor([outcome.comment], new Map(), new Map());
    return toCommentView(outcome.comment, lookup);
  }

  async react(
    slug: string,
    commentId: string,
    userId: string,
    input: SetPublicationReactionDto,
  ): Promise<CommentReactionSummary> {
    const outcome = await this.comments.setCommentReaction(slug, commentId, userId, input.value);
    if (!outcome) throw new NotFoundException(COMMENT_PARENT_NOT_FOUND_MESSAGE);
    await this.notifier?.commentReacted(outcome, userId, input.value);
    return outcome.summary;
  }

  async unreact(slug: string, commentId: string, userId: string): Promise<CommentReactionSummary> {
    const outcome = await this.comments.removeCommentReaction(slug, commentId, userId);
    if (!outcome) throw new NotFoundException(COMMENT_PARENT_NOT_FOUND_MESSAGE);
    return outcome.summary;
  }

  /** Real, active accounts named with @, never the author, once each. Lookups never throw. */
  private async resolveMentions(
    content: string,
    authorId: string,
  ): Promise<Array<{ userId: string; username: string }>> {
    const candidates = parseMentionUsernames(content);
    const profiles = await Promise.all(
      candidates.map((name) => this.identity.resolveByUsername(name)),
    );
    const seen = new Set<string>([authorId]);
    const resolved: Array<{ userId: string; username: string }> = [];
    for (const profile of profiles) {
      if (!profile || seen.has(profile.id)) continue;
      seen.add(profile.id);
      resolved.push({ userId: profile.id, username: profile.username });
    }
    return resolved;
  }

  private async lookupFor(
    records: readonly CommentRecord[],
    tallies: CommentLookup['tallies'],
    replyCounts: CommentLookup['replyCounts'],
  ): Promise<CommentLookup> {
    const authors = await this.identity.resolveMany(records.flatMap(recordPersonIds));
    return { authors, tallies, replyCounts };
  }

  private async refreshBoardCounts(slug: string): Promise<void> {
    if (!this.boardCounts) return;
    try {
      await this.boardCounts.commentsChanged(slug);
    } catch (error: unknown) {
      this.logger.warn(`Board counts update failed: ${errorText(error)}`);
    }
  }
}
