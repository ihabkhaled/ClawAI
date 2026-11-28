import { Module } from '@nestjs/common';
import { ModelCostController } from './controllers/model-cost.controller';
import { ModelIntelligenceController } from './controllers/model-intelligence.controller';
import { RouterModelsController } from './controllers/router-models.controller';
import { ModelSizeController } from './controllers/model-size.controller';
import { RouterModelRegistryManager } from './managers/router-model-registry.manager';
import { DeploymentSeedRepository } from './repositories/deployment-seed.repository';
import { ModelDiscoveryRepository } from './repositories/model-discovery.repository';
import { RouterChainSeedRepository } from './repositories/router-chain-seed.repository';
import { ModelCostRepository } from './repositories/model-cost.repository';
import { ModelCostSeedRepository } from './repositories/model-cost-seed.repository';
import { ModelParameterSeedRepository } from './repositories/model-parameter-seed.repository';
import { RouterAdminOverrideRepository } from './repositories/router-admin-override.repository';
import { RouterModelRegistryRepository } from './repositories/router-model-registry.repository';
import { DeploymentSeedService } from './services/deployment-seed.service';
import { ModelDiscoveryService } from './services/model-discovery.service';
import { RouterChainSeedService } from './services/router-chain-seed.service';
import { ModelCostInternalController } from './controllers/model-cost-internal.controller';
import { ModelContextWindowInternalController } from './controllers/model-context-window-internal.controller';
import { ModelVisibilityInternalController } from './controllers/model-visibility-internal.controller';
import { ModelVisibilityService } from './services/model-visibility.service';
import { ModelCostCatalogService } from './services/model-cost-catalog.service';
import { ModelCostService } from './services/model-cost.service';
import { ModelCostSeedService } from './services/model-cost-seed.service';
import { ModelParameterSeedService } from './services/model-parameter-seed.service';
import { ModelIntelligenceService } from './services/model-intelligence.service';
import { RouterModelsService } from './services/router-models.service';

@Module({
  controllers: [
    RouterModelsController,
    ModelSizeController,
    ModelIntelligenceController,
    ModelCostController,
    ModelCostInternalController,
    ModelContextWindowInternalController,
    ModelVisibilityInternalController,
  ],
  providers: [
    RouterModelsService,
    ModelVisibilityService,
    ModelIntelligenceService,
    ModelCostService,
    ModelCostCatalogService,
    ModelCostSeedService,
    ModelParameterSeedService,
    DeploymentSeedService,
    RouterChainSeedService,
    ModelDiscoveryService,
    RouterModelRegistryManager,
    RouterModelRegistryRepository,
    RouterAdminOverrideRepository,
    ModelCostRepository,
    ModelCostSeedRepository,
    ModelParameterSeedRepository,
    DeploymentSeedRepository,
    RouterChainSeedRepository,
    ModelDiscoveryRepository,
  ],
  exports: [
    RouterModelsService,
    ModelIntelligenceService,
    ModelCostService,
    ModelCostCatalogService,
    RouterModelRegistryManager,
    RouterModelRegistryRepository,
  ],
})
export class RouterModelsModule {}
