import { Module } from "@nestjs/common";
import { ConnectorsController } from "./controllers/connectors.controller";
import { ConnectorsInternalController } from "./controllers/connectors-internal.controller";
import { ConnectorsService } from "./services/connectors.service";
import { ConnectorsManager } from "./managers/connectors.manager";
import { ConnectorsRepository } from "./repositories/connectors.repository";
import { ConnectorModelsRepository } from "./repositories/connector-models.repository";
import { HealthEventsRepository } from "./repositories/health-events.repository";
import { SyncRunsRepository } from "./repositories/sync-runs.repository";

@Module({
  controllers: [ConnectorsController, ConnectorsInternalController],
  providers: [
    ConnectorsService,
    ConnectorsManager,
    ConnectorsRepository,
    ConnectorModelsRepository,
    HealthEventsRepository,
    SyncRunsRepository,
  ],
  exports: [ConnectorsService],
})
export class ConnectorsModule {}
