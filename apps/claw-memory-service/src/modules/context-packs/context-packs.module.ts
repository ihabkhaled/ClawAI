import { Module } from '@nestjs/common';
import { ContextPacksController } from './controllers/context-packs.controller';
import { ContextPacksInternalController } from './controllers/context-packs-internal.controller';
import { ContextPackEmbeddingManager } from './managers/context-pack-embedding.manager';
import { ContextPacksRepository } from './repositories/context-packs.repository';
import { ContextPacksService } from './services/context-packs.service';
import { ResourceEntitlementService } from '../../common/services/resource-entitlement.service';

@Module({
  controllers: [ContextPacksController, ContextPacksInternalController],
  providers: [
    ContextPacksService,
    ContextPacksRepository,
    ContextPackEmbeddingManager,
    ResourceEntitlementService,
  ],
  exports: [
    ContextPacksService,
    ContextPacksRepository,
    ContextPackEmbeddingManager,
    ResourceEntitlementService,
  ],
})
export class ContextPacksModule {}
