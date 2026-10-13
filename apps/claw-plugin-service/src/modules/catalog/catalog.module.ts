import { Module } from '@nestjs/common';

import { PluginCatalogController } from './controllers/plugin-catalog.controller';
import { CatalogPresenterManager } from './managers/catalog-presenter.manager';
import { CatalogRepository } from './repositories/catalog.repository';
import { PluginCatalogService } from './services/plugin-catalog.service';

@Module({
  controllers: [PluginCatalogController],
  providers: [PluginCatalogService, CatalogPresenterManager, CatalogRepository],
})
export class CatalogModule {}
