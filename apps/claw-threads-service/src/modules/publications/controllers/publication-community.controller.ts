import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, Public } from '@claw/shared-auth';
import type { AuthenticatedUser } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type CreatePublicationCommentDto,
  createPublicationCommentSchema,
} from '../dto/create-publication-comment.dto';
import {
  type CreatePublicationChangeRequestDto,
  createPublicationChangeRequestSchema,
} from '../dto/create-publication-change-request.dto';
import {
  type CreatePublicationReportDto,
  createPublicationReportSchema,
} from '../dto/create-publication-report.dto';
import {
  type SetPublicationReactionDto,
  setPublicationReactionSchema,
} from '../dto/set-publication-reaction.dto';
import {
  commentIdParamSchema,
  type ListCommentRepliesQuery,
  listCommentRepliesQuerySchema,
  type ListPublicationCommentsQuery,
  listPublicationCommentsQuerySchema,
} from '../dto/list-publication-comments.dto';
import { optionalViewerId } from '../../publication-community/utilities/optional-viewer.utility';
import { PublicationCommentsService } from '../services/publication-comments.service';
import { PublicationCommunityService } from '../services/publication-community.service';

@Controller('thread-publications/public/:slug')
export class PublicationCommunityController {
  constructor(
    private readonly community: PublicationCommunityService,
    private readonly comments: PublicationCommentsService,
  ) {}

  @Public()
  @Get('comments')
  listComments(
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(listPublicationCommentsQuerySchema))
    query: ListPublicationCommentsQuery,
    @Headers('authorization') authorization?: string,
  ): ReturnType<PublicationCommentsService['list']> {
    return this.comments.list(slug, query, optionalViewerId(authorization));
  }

  @Public()
  @Get('comments/:rootId/replies')
  listReplies(
    @Param('slug') slug: string,
    @Param('rootId', new ZodValidationPipe(commentIdParamSchema)) rootId: string,
    @Query(new ZodValidationPipe(listCommentRepliesQuerySchema)) query: ListCommentRepliesQuery,
    @Headers('authorization') authorization?: string,
  ): ReturnType<PublicationCommentsService['listReplies']> {
    return this.comments.listReplies(slug, rootId, query, optionalViewerId(authorization));
  }

  @Post('comments')
  addComment(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(createPublicationCommentSchema)) body: CreatePublicationCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationCommentsService['add']> {
    return this.comments.add(slug, user.id, body);
  }

  @Put('comments/:commentId/reaction')
  setCommentReaction(
    @Param('slug') slug: string,
    @Param('commentId', new ZodValidationPipe(commentIdParamSchema)) commentId: string,
    @Body(new ZodValidationPipe(setPublicationReactionSchema)) body: SetPublicationReactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationCommentsService['react']> {
    return this.comments.react(slug, commentId, user.id, body);
  }

  @Delete('comments/:commentId/reaction')
  removeCommentReaction(
    @Param('slug') slug: string,
    @Param('commentId', new ZodValidationPipe(commentIdParamSchema)) commentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationCommentsService['unreact']> {
    return this.comments.unreact(slug, commentId, user.id);
  }

  @Public()
  @Get('reactions')
  getReactionSummary(
    @Param('slug') slug: string,
    @Headers('authorization') authorization?: string,
  ): ReturnType<PublicationCommunityService['getReactionSummary']> {
    return this.community.getReactionSummary(slug, optionalViewerId(authorization));
  }

  @Post('reactions')
  setReaction(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(setPublicationReactionSchema)) body: SetPublicationReactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationCommunityService['setReaction']> {
    return this.community.setReaction(slug, user.id, body);
  }

  @Delete('reactions')
  removeReaction(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationCommunityService['removeReaction']> {
    return this.community.removeReaction(slug, user.id);
  }

  @Post('change-requests')
  requestChange(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(createPublicationChangeRequestSchema))
    body: CreatePublicationChangeRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationCommunityService['requestChange']> {
    return this.community.requestChange(slug, user.id, body);
  }

  @Post('reports')
  report(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(createPublicationReportSchema)) body: CreatePublicationReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationCommunityService['report']> {
    return this.community.report(slug, user.id, body);
  }
}
