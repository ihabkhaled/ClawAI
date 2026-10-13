import { Body, Controller, Get, Header, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { RequirePermissions } from '@claw/shared-entitlements';
import {
  type AuthenticatedUser,
  Permission,
  type PluginAdminCatalogEntryView,
  type PluginSettingView,
} from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { catalogSlugSchema } from '../../catalog/dto/catalog-query.dto';
import { INSTALLS_CACHE_CONTROL } from '../../installs/constants/installs.constants';
import {
  type UpdateAdminCatalogBody,
  updateAdminCatalogBodySchema,
  type UpdateSettingsBody,
  updateSettingsBodySchema,
} from '../dto/admin.dto';
import { AdminCatalogService } from '../services/admin-catalog.service';
import { AdminSettingsService } from '../services/admin-settings.service';

@RequirePermissions(Permission.PLUGINS_ADMIN)
@Controller('plugins/admin')
export class PluginAdminController {
  constructor(
    private readonly catalog: AdminCatalogService,
    private readonly settings: AdminSettingsService,
  ) {}

  @Get('catalog')
  @Header('Cache-Control', INSTALLS_CACHE_CONTROL)
  listCatalog(): Promise<PluginAdminCatalogEntryView[]> {
    return this.catalog.list();
  }

  @Get('catalog/:slug')
  @Header('Cache-Control', INSTALLS_CACHE_CONTROL)
  getCatalogEntry(
    @Param('slug', new ZodValidationPipe(catalogSlugSchema)) slug: string,
  ): Promise<PluginAdminCatalogEntryView> {
    return this.catalog.get(slug);
  }

  @Patch('catalog/:slug')
  updateCatalogEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug', new ZodValidationPipe(catalogSlugSchema)) slug: string,
    @Body(new ZodValidationPipe(updateAdminCatalogBodySchema)) body: UpdateAdminCatalogBody,
  ): Promise<PluginAdminCatalogEntryView> {
    return this.catalog.update(user.id, slug, body);
  }

  @Get('settings')
  @Header('Cache-Control', INSTALLS_CACHE_CONTROL)
  listSettings(): Promise<PluginSettingView[]> {
    return this.settings.list();
  }

  @Patch('settings')
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateSettingsBodySchema)) body: UpdateSettingsBody,
  ): Promise<PluginSettingView[]> {
    return this.settings.update(user.id, body);
  }
}
