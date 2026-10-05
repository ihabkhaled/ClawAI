import { Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import type { AuthenticatedUser } from '@claw/shared-types';

import { PublicationLifecycleService } from '../services/publication-lifecycle.service';
import type { PublishedPublication } from '../types/publication.types';

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
}
