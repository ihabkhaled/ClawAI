import { Module } from '@nestjs/common';
import { CatalogController } from './controllers/catalog.controller';
import { CatalogRefreshManager } from './managers/catalog-refresh.manager';
import { CatalogRepository } from './repositories/catalog.repository';
import { CatalogService } from './services/catalog.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, CatalogRepository, CatalogRefreshManager],
  exports: [CatalogService, CatalogRepository],
})
export class CatalogModule {}
