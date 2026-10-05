import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
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
import { PublicationCommunityService } from '../services/publication-community.service';

@Controller('thread-publications/public/:slug')
export class PublicationCommunityController {
  constructor(private readonly community: PublicationCommunityService) {}

  @Public()
  @Get('comments')
  listComments(
    @Param('slug') slug: string,
  ): ReturnType<PublicationCommunityService['listComments']> {
    return this.community.listComments(slug);
  }

  @Post('comments')
  addComment(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(createPublicationCommentSchema)) body: CreatePublicationCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationCommunityService['addComment']> {
    return this.community.addComment(slug, user.id, body);
  }

  @Public()
  @Get('reactions')
  getReactionSummary(
    @Param('slug') slug: string,
  ): ReturnType<PublicationCommunityService['getReactionSummary']> {
    return this.community.getReactionSummary(slug);
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
