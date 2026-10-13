import { Controller, Get, Header, Headers, Param, Query } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { RequirePermissions } from '@claw/shared-entitlements';
import { type AuthenticatedUser, Permission } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { CATALOG_CACHE_CONTROL, CATALOG_VARY } from '../constants/catalog.constants';
import {
  type CatalogDetailQuery,
  catalogDetailQuerySchema,
  type CatalogListQuery,
  catalogListQuerySchema,
  catalogSlugSchema,
} from '../dto/catalog-query.dto';
import { PluginCatalogService } from '../services/plugin-catalog.service';
import { type CatalogDetail, type CatalogPage } from '../types/catalog.types';

@RequirePermissions(Permission.PLUGINS_USE)
@Controller('plugins/catalog')
export class PluginCatalogController {
  constructor(private readonly catalog: PluginCatalogService) {}

  @Get()
  @Header('Cache-Control', CATALOG_CACHE_CONTROL)
  @Header('Vary', CATALOG_VARY)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(catalogListQuerySchema)) query: CatalogListQuery,
    @Headers('accept-language') acceptLanguage: string | undefined,
  ): Promise<CatalogPage> {
    return this.catalog.list(user.id, query, acceptLanguage);
  }

  @Get(':slug')
  @Header('Cache-Control', CATALOG_CACHE_CONTROL)
  @Header('Vary', CATALOG_VARY)
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug', new ZodValidationPipe(catalogSlugSchema)) slug: string,
    @Query(new ZodValidationPipe(catalogDetailQuerySchema)) query: CatalogDetailQuery,
    @Headers('accept-language') acceptLanguage: string | undefined,
  ): Promise<CatalogDetail> {
    return this.catalog.detail(user.id, slug, query, acceptLanguage);
  }
}
