import { Module } from '@nestjs/common';
import { CatalogController } from './controllers/catalog.controller';
import { CatalogInternalController } from './controllers/catalog-internal.controller';
import { CatalogRefreshManager } from './managers/catalog-refresh.manager';
import { HfDiscoveryManager } from './managers/hf-discovery.manager';
import { RoutingSnapshotManager } from './managers/routing-snapshot.manager';
import { CatalogRepository } from './repositories/catalog.repository';
import { CatalogService } from './services/catalog.service';

@Module({
  controllers: [CatalogController, CatalogInternalController],
  providers: [
    CatalogService,
    CatalogRepository,
    CatalogRefreshManager,
    HfDiscoveryManager,
    RoutingSnapshotManager,
  ],
  exports: [CatalogService, CatalogRepository],
})
export class CatalogModule {}
