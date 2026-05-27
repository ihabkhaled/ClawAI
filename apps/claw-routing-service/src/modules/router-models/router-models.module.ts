import { Module } from '@nestjs/common';
import { ModelIntelligenceController } from './controllers/model-intelligence.controller';
import { RouterModelsController } from './controllers/router-models.controller';
import { RouterModelRegistryManager } from './managers/router-model-registry.manager';
import { RouterAdminOverrideRepository } from './repositories/router-admin-override.repository';
import { RouterModelRegistryRepository } from './repositories/router-model-registry.repository';
import { ModelIntelligenceService } from './services/model-intelligence.service';
import { RouterModelsService } from './services/router-models.service';

@Module({
  controllers: [RouterModelsController, ModelIntelligenceController],
  providers: [
    RouterModelsService,
    ModelIntelligenceService,
    RouterModelRegistryManager,
    RouterModelRegistryRepository,
    RouterAdminOverrideRepository,
  ],
  exports: [
    RouterModelsService,
    ModelIntelligenceService,
    RouterModelRegistryManager,
    RouterModelRegistryRepository,
  ],
})
export class RouterModelsModule {}
