import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import type { AuthenticatedUser } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type ListOwnedPublicationsQuery,
  listOwnedPublicationsQuerySchema,
} from '../dto/list-owned-publications-query.dto';
import { PublicationOwnerListService } from '../services/publication-owner-list.service';
import { PublicationChangeRequestViewsService } from '../services/publication-change-request-views.service';
import { PublicationLifecycleService } from '../services/publication-lifecycle.service';

@Controller('thread-publications')
export class PublicationListController {
  constructor(
    private readonly lifecycle: PublicationLifecycleService,
    private readonly changeRequestViews: PublicationChangeRequestViewsService,
    private readonly ownerList: PublicationOwnerListService,
  ) {}

  @Get('mine')
  listOwned(
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationLifecycleService['listOwned']> {
    return this.lifecycle.listOwned(user.id);
  }

  /**
   * The owner's paged "My Threads" list (ADR-205): `page`, `pageSize` (1..50), `q` (title) and
   * `status` (ALL, GENERATING, READY, PUBLISHED, FAILED). Owner only, newest first.
   */
  @Get('mine/page')
  listOwnedPage(
    @Query(new ZodValidationPipe(listOwnedPublicationsQuerySchema))
    query: ListOwnedPublicationsQuery,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationOwnerListService['list']> {
    return this.ownerList.list(user.id, query);
  }

  /** The signed-in person's own suggestions on other people's Threads, with their status. */
  @Get('change-requests/mine')
  listMyChangeRequests(
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationChangeRequestViewsService['listMine']> {
    return this.changeRequestViews.listMine(user.id);
  }
}
