import { Module } from '@nestjs/common';
import { ConnectorsController } from './controllers/connectors.controller';
import { ConnectorsInternalController } from './controllers/connectors-internal.controller';
import { PublicModelCatalogController } from './controllers/public-model-catalog.controller';
import { CreditHeadroomInternalController } from './controllers/credit-headroom-internal.controller';
import { CreditHeadroomService } from './services/credit-headroom.service';
import { ModelOutputLimitInternalController } from './controllers/model-output-limit-internal.controller';
import { ModelOutputLimitService } from './services/model-output-limit.service';
import { ModelUnavailableInternalController } from './controllers/model-unavailable-internal.controller';
import { ModelUnavailableService } from './services/model-unavailable.service';
import { CreditHeadroomManager } from './managers/credit-headroom.manager';
import { PublicModelCatalogService } from './services/public-model-catalog.service';
import { ConnectorsService } from './services/connectors.service';
import { ConnectorsManager } from './managers/connectors.manager';
import { ModelsSnapshotManager } from './managers/models-snapshot.manager';
import { ConnectorsRepository } from './repositories/connectors.repository';
import { ConnectorModelsRepository } from './repositories/connector-models.repository';
import { HealthEventsRepository } from './repositories/health-events.repository';
import { SyncRunsRepository } from './repositories/sync-runs.repository';
import { ProviderDefinitionsController } from './controllers/provider-definitions.controller';
import { ProviderDefinitionsService } from './services/provider-definitions.service';
import { ProviderDefinitionsRepository } from './repositories/provider-definitions.repository';

@Module({
  controllers: [
    ProviderDefinitionsController,
    ConnectorsController,
    ConnectorsInternalController,
    PublicModelCatalogController,
    CreditHeadroomInternalController,
    ModelOutputLimitInternalController,
    ModelUnavailableInternalController,
  ],
  providers: [
    PublicModelCatalogService,
    ModelOutputLimitService,
    ModelUnavailableService,
    CreditHeadroomService,
    CreditHeadroomManager,
    ConnectorsService,
    ProviderDefinitionsService,
    ConnectorsManager,
    ModelsSnapshotManager,
    ConnectorsRepository,
    ConnectorModelsRepository,
    HealthEventsRepository,
    SyncRunsRepository,
    ProviderDefinitionsRepository,
  ],
  exports: [ConnectorsService],
})
export class ConnectorsModule {}
