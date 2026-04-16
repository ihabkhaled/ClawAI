import { Module } from '@nestjs/common';
import { OllamaController } from './ollama.controller';
import { OllamaInternalController } from './ollama-internal.controller';
import { OllamaService } from './ollama.service';
import { OllamaManager } from './managers/ollama.manager';
import { LocalModelsRepository } from './repositories/local-models.repository';
import { RoleAssignmentsRepository } from './repositories/role-assignments.repository';
import { PullJobsRepository } from './repositories/pull-jobs.repository';
import { RuntimeConfigsRepository } from './repositories/runtime-configs.repository';
import { ModelCatalogRepository } from './repositories/model-catalog.repository';
import { CatalogSeedService } from './services/catalog-seed.service';
import { CatalogRemoteMetadataService } from './services/catalog-remote-metadata.service';

@Module({
  controllers: [OllamaController, OllamaInternalController],
  providers: [
    OllamaService,
    OllamaManager,
    LocalModelsRepository,
    RoleAssignmentsRepository,
    PullJobsRepository,
    RuntimeConfigsRepository,
    ModelCatalogRepository,
    CatalogSeedService,
    CatalogRemoteMetadataService,
  ],
  exports: [OllamaService],
})
export class OllamaModule {}
