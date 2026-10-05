import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import type { AuthenticatedUser } from '@claw/shared-types';

import { PublicationLifecycleService } from '../services/publication-lifecycle.service';

@Controller('thread-publications')
export class PublicationListController {
  constructor(private readonly lifecycle: PublicationLifecycleService) {}

  @Get('mine')
  listOwned(
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationLifecycleService['listOwned']> {
    return this.lifecycle.listOwned(user.id);
  }
}
