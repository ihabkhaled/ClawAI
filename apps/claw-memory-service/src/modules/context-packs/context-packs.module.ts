import { Module } from '@nestjs/common';
import { ContextPacksController } from './controllers/context-packs.controller';
import { ContextPacksInternalController } from './controllers/context-packs-internal.controller';
import { ContextPackEmbeddingManager } from './managers/context-pack-embedding.manager';
import { ContextPacksRepository } from './repositories/context-packs.repository';
import { ContextPacksService } from './services/context-packs.service';

@Module({
  controllers: [ContextPacksController, ContextPacksInternalController],
  providers: [ContextPacksService, ContextPacksRepository, ContextPackEmbeddingManager],
  exports: [ContextPacksService, ContextPacksRepository, ContextPackEmbeddingManager],
})
export class ContextPacksModule {}
