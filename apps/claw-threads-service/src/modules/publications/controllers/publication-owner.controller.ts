import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import type { AuthenticatedUser } from '@claw/shared-types';

import { PublicationLifecycleService } from '../services/publication-lifecycle.service';
import {
  type EditPublicationRevisionDto,
  editPublicationRevisionSchema,
} from '../dto/edit-publication-revision.dto';
import type { PublishedPublication } from '../types/publication.types';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';

@Controller('thread-publications/:publicationId')
export class PublicationOwnerController {
  constructor(private readonly lifecycle: PublicationLifecycleService) {}

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
}
