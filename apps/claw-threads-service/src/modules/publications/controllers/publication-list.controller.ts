import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import type { AuthenticatedUser } from '@claw/shared-types';

import { PublicationChangeRequestViewsService } from '../services/publication-change-request-views.service';
import { PublicationLifecycleService } from '../services/publication-lifecycle.service';

@Controller('thread-publications')
export class PublicationListController {
  constructor(
    private readonly lifecycle: PublicationLifecycleService,
    private readonly changeRequestViews: PublicationChangeRequestViewsService,
  ) {}

  @Get('mine')
  listOwned(
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationLifecycleService['listOwned']> {
    return this.lifecycle.listOwned(user.id);
  }

  /** The signed-in person's own suggestions on other people's Threads, with their status. */
  @Get('change-requests/mine')
  listMyChangeRequests(
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationChangeRequestViewsService['listMine']> {
    return this.changeRequestViews.listMine(user.id);
  }
}
