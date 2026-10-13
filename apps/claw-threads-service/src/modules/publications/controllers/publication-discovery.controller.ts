import { Controller, Get, Header, Query } from '@nestjs/common';
import { Public } from '@claw/shared-auth';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type PublicDiscoveryQuery,
  publicDiscoveryQuerySchema,
  type PublicSitemapQuery,
  publicSitemapQuerySchema,
} from '../dto/public-discovery-query.dto';
import { PublicationDiscoveryService } from '../services/publication-discovery.service';

@Public()
@Controller('thread-publications/public')
export class PublicationDiscoveryController {
  constructor(private readonly discovery: PublicationDiscoveryService) {}

  @Get('discover')
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  list(@Query(new ZodValidationPipe(publicDiscoveryQuerySchema)) query: PublicDiscoveryQuery) {
    return this.discovery.list(query);
  }

  @Get('sitemap')
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
  sitemap(@Query(new ZodValidationPipe(publicSitemapQuerySchema)) query: PublicSitemapQuery) {
    return this.discovery.sitemap(query);
  }
}
