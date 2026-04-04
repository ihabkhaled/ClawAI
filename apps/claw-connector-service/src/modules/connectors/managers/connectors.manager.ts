import { Injectable } from "@nestjs/common";
import { type Connector, ModelSyncStatus } from "../../../generated/prisma";
import { AppConfig } from "../../../app/config/app.config";
import { decrypt } from "../../../common/utilities";
import { ConnectorModelsRepository } from "../repositories/connector-models.repository";
import { HealthEventsRepository } from "../repositories/health-events.repository";
import { SyncRunsRepository } from "../repositories/sync-runs.repository";
import { ConnectorsRepository } from "../repositories/connectors.repository";
import { getAdapter } from "./adapters/adapter-factory";
import { type ConnectorConfig } from "./provider-adapter.interface";
import {
  type HealthCheckResult,
  type SyncModelsResult,
} from "../types/connectors.types";

@Injectable()
export class ConnectorsManager {
  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly connectorModelsRepository: ConnectorModelsRepository,
    private readonly healthEventsRepository: HealthEventsRepository,
    private readonly syncRunsRepository: SyncRunsRepository,
  ) {}

  async testConnector(connector: Connector): Promise<HealthCheckResult> {
    const config = this.getDecryptedConfig(connector);
    const adapter = getAdapter(connector.provider);
    const result = await adapter.healthCheck(config);

    await this.healthEventsRepository.create({
      connectorId: connector.id,
      status: result.status,
      latencyMs: result.latencyMs,
      errorMessage: result.errorMessage,
    });

    await this.connectorsRepository.update(connector.id, { status: result.status });
    return result;
  }

  async syncModels(connector: Connector): Promise<SyncModelsResult> {
    const config = this.getDecryptedConfig(connector);
    const adapter = getAdapter(connector.provider);

    const syncRun = await this.syncRunsRepository.create({
      connectorId: connector.id,
      status: ModelSyncStatus.RUNNING,
    });

    try {
      const models = await adapter.syncModels(config);
      const existingCount = await this.connectorModelsRepository.countByConnectorId(connector.id);

      await this.connectorModelsRepository.upsertMany(connector.id, connector.provider, models);

      const modelsAdded = Math.max(0, models.length - existingCount);
      const modelsRemoved = Math.max(0, existingCount - models.length);

      await this.syncRunsRepository.update(syncRun.id, {
        status: ModelSyncStatus.COMPLETED,
        modelsFound: models.length,
        modelsAdded,
        modelsRemoved,
        completedAt: new Date(),
      });

      return { modelsFound: models.length, modelsAdded, modelsRemoved };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown sync error";
      await this.syncRunsRepository.update(syncRun.id, {
        status: ModelSyncStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      });
      throw error;
    }
  }

  getDecryptedConfig(connector: Connector): ConnectorConfig {
    const config = AppConfig.get();
    const apiKey = connector.encryptedConfig
      ? decrypt(connector.encryptedConfig, config.ENCRYPTION_KEY)
      : "";

    return {
      provider: connector.provider,
      apiKey,
      baseUrl: connector.baseUrl ?? undefined,
      region: connector.region ?? undefined,
    };
  }
}
