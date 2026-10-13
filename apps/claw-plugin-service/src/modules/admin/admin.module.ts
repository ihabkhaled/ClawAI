import { Module } from '@nestjs/common';

import { PluginAdminController } from './controllers/plugin-admin.controller';
import { AdminCatalogPresenterManager } from './managers/admin-catalog-presenter.manager';
import { AdminCatalogRepository } from './repositories/admin-catalog.repository';
import { AdminSettingsRepository } from './repositories/admin-settings.repository';
import { AdminCatalogService } from './services/admin-catalog.service';
import { AdminSettingsService } from './services/admin-settings.service';

@Module({
  controllers: [PluginAdminController],
  providers: [
    AdminCatalogService,
    AdminSettingsService,
    AdminCatalogPresenterManager,
    AdminCatalogRepository,
    AdminSettingsRepository,
  ],
})
export class AdminModule {}
