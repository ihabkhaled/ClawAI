import { Controller, Get, UseGuards } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { PublicModelCatalogService } from '../services/public-model-catalog.service';
import type { PublicModelCatalog } from '../types/public-model-catalog.types';

/**
 * The model catalog behind the public marketing pages.
 *
 * It gets its own controller rather than another method on
 * `ConnectorsInternalController` because the two have different threat models.
 * That controller's routes hand out decrypted provider credentials and full
 * model snapshots to sibling services; this one's response is safe enough to
 * print on a web page, and mixing them would invite someone to reuse the wrong
 * guard on the wrong route.
 *
 * `@Public()` + `ServiceTokenGuard` means "a SERVICE may call this, not a
 * user". The frontend reaches it from its server-side fetch with the
 * inter-service token, so the browser never sees this URL and nginx need not
 * expose it. The data would survive being public — it carries no rate, no
 * credential and no connector identity — but there is no reason to open a door
 * nobody needs to walk through.
 */
@Public()
@UseGuards(ServiceTokenGuard)
@Controller('internal/connectors/public-catalog')
export class PublicModelCatalogController {
  constructor(private readonly service: PublicModelCatalogService) {}

  @Get()
  async getCatalog(): Promise<PublicModelCatalog> {
    return this.service.getCatalog();
  }
}
