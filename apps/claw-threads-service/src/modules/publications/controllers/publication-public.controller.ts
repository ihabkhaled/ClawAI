import { Controller, Get, Header, Param } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { PublicationPublicReadService } from '../services/publication-public-read.service';

@Public()
@Controller('thread-publications/public')
export class PublicationPublicController {
  constructor(private readonly reader: PublicationPublicReadService) {}

  @Get(':slug')
  @Header('Cache-Control', 'no-store')
  getPublication(@Param('slug') slug: string): ReturnType<PublicationPublicReadService['get']> {
    return this.reader.get(slug);
  }
}
