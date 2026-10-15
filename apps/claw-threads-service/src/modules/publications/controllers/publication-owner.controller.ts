import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '@claw/shared-auth';
import type { AuthenticatedUser } from '@claw/shared-types';

import { PublicationLifecycleService } from '../services/publication-lifecycle.service';
import {
  type EditPublicationRevisionDto,
  editPublicationRevisionSchema,
} from '../dto/edit-publication-revision.dto';
import type { PublishedPublication } from '../types/publication.types';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ThreadGenerationErrorCode } from '../../../common/enums/thread-generation-error-code.enum';
import {
  type ResolvePublicationChangeRequestDto,
  resolvePublicationChangeRequestSchema,
} from '../dto/resolve-publication-change-request.dto';
import { PublicationChangeRequestViewsService } from '../services/publication-change-request-views.service';
import { PublicationCommunityService } from '../services/publication-community.service';
import { PublicationGenerationOwnerService } from '../services/publication-generation-owner.service';
import {
  type RetryThreadGenerationDto,
  retryThreadGenerationSchema,
} from '../dto/retry-thread-generation.dto';

@Controller('thread-publications/:publicationId')
export class PublicationOwnerController {
  constructor(
    private readonly lifecycle: PublicationLifecycleService,
    private readonly community: PublicationCommunityService,
    private readonly changeRequestViews: PublicationChangeRequestViewsService,
    private readonly generationOwner: PublicationGenerationOwnerService,
  ) {}

  @Post('publish')
  approveAndPublish(
    @Param('publicationId') publicationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PublishedPublication> {
    return this.lifecycle.approveAndPublish(publicationId, user.id);
  }

  @Post('revisions')
  editRevision(
    @Param('publicationId') publicationId: string,
    @Body(new ZodValidationPipe(editPublicationRevisionSchema)) body: EditPublicationRevisionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationLifecycleService['editRevision']> {
    return this.lifecycle.editRevision(publicationId, user.id, body);
  }

  @Get('revisions/:revisionId/revalidation-state')
  getRevisionReviewState(
    @Param('publicationId') publicationId: string,
    @Param('revisionId') revisionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationLifecycleService['getRevisionReviewState']> {
    return this.lifecycle.getRevisionReviewState(publicationId, revisionId, user.id);
  }

  @Get('generation-state')
  getGenerationState(
    @Param('publicationId') publicationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationLifecycleService['getGenerationState']> {
    return this.lifecycle.getGenerationState(publicationId, user.id);
  }

  @Get('generation-progress')
  getGenerationProgress(
    @Param('publicationId') publicationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationGenerationOwnerService['getProgress']> {
    return this.generationOwner.getProgress(publicationId, user.id);
  }

  @Post('retry-generation')
  retryGeneration(
    @Param('publicationId') publicationId: string,
    @Body(
      new ZodValidationPipe(retryThreadGenerationSchema, ThreadGenerationErrorCode.REQUEST_INVALID),
    )
    body: RetryThreadGenerationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationGenerationOwnerService['retry']> {
    return this.generationOwner.retry(publicationId, user.id, body);
  }

  @Delete()
  deletePublication(
    @Param('publicationId') publicationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationGenerationOwnerService['delete']> {
    return this.generationOwner.delete(publicationId, user.id);
  }

  @Post('cancel-generation')
  cancelGeneration(
    @Param('publicationId') publicationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ publicationId: string; status: 'CANCEL_REQUESTED' }> {
    return this.lifecycle.cancelGeneration(publicationId, user.id);
  }

  @Post('unpublish')
  unpublish(
    @Param('publicationId') publicationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ unpublished: true }> {
    return this.lifecycle.unpublish(publicationId, user.id);
  }

  @Get('export')
  export(
    @Param('publicationId') publicationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('format') format: string | undefined,
  ): ReturnType<PublicationLifecycleService['export']> {
    return this.lifecycle.export(publicationId, user.id, format);
  }

  @Get('change-requests')
  listChangeRequests(
    @Param('publicationId') publicationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationChangeRequestViewsService['listForOwner']> {
    return this.changeRequestViews.listForOwner(publicationId, user.id);
  }

  @Post('change-requests/:requestId')
  async resolveChangeRequest(
    @Param('publicationId') publicationId: string,
    @Param('requestId') requestId: string,
    @Body(new ZodValidationPipe(resolvePublicationChangeRequestSchema))
    body: ResolvePublicationChangeRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response?: Response,
  ): ReturnType<PublicationCommunityService['resolveOwnerChangeRequest']> {
    const answer = await this.community.resolveOwnerChangeRequest(
      publicationId,
      user.id,
      requestId,
      body,
    );
    // A repeated decision created nothing: 200 and the stored decision, not 201.
    if (answer.unchanged) response?.status(HttpStatus.OK);
    return answer;
  }
}
