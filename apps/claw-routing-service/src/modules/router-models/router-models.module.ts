import { Module } from '@nestjs/common';
import { ModelCostController } from './controllers/model-cost.controller';
import { ModelIntelligenceController } from './controllers/model-intelligence.controller';
import { RouterModelsController } from './controllers/router-models.controller';
import { RouterModelRegistryManager } from './managers/router-model-registry.manager';
import { ModelCostRepository } from './repositories/model-cost.repository';
import { RouterAdminOverrideRepository } from './repositories/router-admin-override.repository';
import { RouterModelRegistryRepository } from './repositories/router-model-registry.repository';
import { ModelCostService } from './services/model-cost.service';
import { ModelIntelligenceService } from './services/model-intelligence.service';
import { RouterModelsService } from './services/router-models.service';

@Module({
  controllers: [RouterModelsController, ModelIntelligenceController, ModelCostController],
  providers: [
    RouterModelsService,
    ModelIntelligenceService,
    ModelCostService,
    RouterModelRegistryManager,
    RouterModelRegistryRepository,
    RouterAdminOverrideRepository,
    ModelCostRepository,
  ],
  exports: [
    RouterModelsService,
    ModelIntelligenceService,
    ModelCostService,
    RouterModelRegistryManager,
    RouterModelRegistryRepository,
  ],
})
export class RouterModelsModule {}
