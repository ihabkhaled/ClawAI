import { Controller, Get, Header, Param } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { PublicationLifecycleService } from '../services/publication-lifecycle.service';

@Public()
@Controller('thread-publications/public')
export class PublicationPublicController {
  constructor(private readonly lifecycle: PublicationLifecycleService) {}

  @Get(':slug')
  @Header('Cache-Control', 'no-store')
  getPublication(
    @Param('slug') slug: string,
  ): ReturnType<PublicationLifecycleService['getPublicPublication']> {
    return this.lifecycle.getPublicPublication(slug);
  }
}
