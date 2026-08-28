import { Injectable, Logger } from '@nestjs/common';
import type { ModelBehaviorProbeResult } from '@claw/shared-types';
import { type Connector, ModelSyncStatus } from '../../../generated/prisma';
import {
  CAPABILITY_PROBE_UNSUPPORTED_CODE,
  CAPABILITY_PROBE_UNSUPPORTED_ID,
} from '../constants/ollama-tool-probe.constants';
import { AppConfig } from '../../../app/config/app.config';
import { decrypt } from '../../../common/utilities';
import { ConnectorModelsRepository } from '../repositories/connector-models.repository';
import { HealthEventsRepository } from '../repositories/health-events.repository';
import { SyncRunsRepository } from '../repositories/sync-runs.repository';
import { ConnectorsRepository } from '../repositories/connectors.repository';
import { getAdapter } from './adapters/adapter-factory';
import { type ConnectorConfig } from './provider-adapter.interface';
import { type HealthCheckResult, type SyncModelsResult } from '../types/connectors.types';

@Injectable()
export class ConnectorsManager {
  private readonly logger = new Logger(ConnectorsManager.name);

  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly connectorModelsRepository: ConnectorModelsRepository,
    private readonly healthEventsRepository: HealthEventsRepository,
    private readonly syncRunsRepository: SyncRunsRepository,
  ) {}

  /**
   * Runs the behavioural tool probe for one model on this connector (§9.2).
   *
   * Only the Ollama adapter implements a probe today, so this reports an
   * explicit unsupported result for the others rather than silently returning
   * a pass — an unprobed model must never look proven.
   */
  async probeModelToolCapability(
    connector: Connector,
    modelKey: string,
  ): Promise<ModelBehaviorProbeResult> {
    const config = this.getDecryptedConfig(connector);
    const adapter = getAdapter(connector.provider);
    if (typeof adapter.probeToolCapability !== 'function') {
      this.logger.warn(
        `probeModelToolCapability: provider ${connector.provider} has no probe implementation`,
      );
      return {
        probeId: CAPABILITY_PROBE_UNSUPPORTED_ID,
        passed: false,
        checkedAt: new Date().toISOString(),
        failureCode: CAPABILITY_PROBE_UNSUPPORTED_CODE,
      };
    }
    this.logger.log(`probeModelToolCapability: probing ${modelKey} on connector ${connector.id}`);
    return adapter.probeToolCapability(config, modelKey);
  }

  async testConnector(connector: Connector): Promise<HealthCheckResult> {
    this.logger.log(
      `testConnector: testing connector ${connector.id} provider=${connector.provider}`,
    );
    this.logger.debug('testConnector: decrypting connector config');
    const config = this.getDecryptedConfig(connector);
    this.logger.debug(`testConnector: getting adapter for provider=${connector.provider}`);
    const adapter = getAdapter(connector.provider);
    this.logger.debug('testConnector: running health check');
    const result = await adapter.healthCheck(config);

    this.logger.log(
      `testConnector: result status=${result.status} latencyMs=${String(result.latencyMs)}`,
    );
    this.logger.debug('testConnector: storing health event');
    await this.healthEventsRepository.create({
      connectorId: connector.id,
      status: result.status,
      latencyMs: result.latencyMs,
      errorMessage: result.errorMessage,
    });

    this.logger.debug(`testConnector: updating connector status to ${result.status}`);
    await this.connectorsRepository.update(connector.id, { status: result.status });
    this.logger.debug('testConnector: connector status updated');
    return result;
  }

  async syncModels(connector: Connector): Promise<SyncModelsResult> {
    this.logger.log(
      `syncModels: syncing models for connector ${connector.id} provider=${connector.provider}`,
    );
    this.logger.debug('syncModels: decrypting connector config');
    const config = this.getDecryptedConfig(connector);
    this.logger.debug(`syncModels: getting adapter for provider=${connector.provider}`);
    const adapter = getAdapter(connector.provider);

    this.logger.debug('syncModels: creating sync run record');
    const syncRun = await this.syncRunsRepository.create({
      connectorId: connector.id,
      status: ModelSyncStatus.RUNNING,
    });
    this.logger.debug(`syncModels: sync run created id=${syncRun.id}`);

    try {
      this.logger.debug('syncModels: fetching models from provider');
      const existingModels = await this.connectorModelsRepository.findByConnectorId(connector.id);
      const existingKeys = new Set(existingModels.map((model) => model.modelKey));
      const models = await adapter.syncModels(config);
      this.logger.debug(`syncModels: provider returned ${String(models.length)} models`);
      const nextKeys = new Set(models.map((model) => model.modelKey));

      this.logger.debug('syncModels: replacing connector models with latest provider snapshot');
      const syncResult = await this.connectorModelsRepository.replaceMany(
        connector.id,
        connector.provider,
        models,
      );

      const modelsAdded = models.filter((model) => !existingKeys.has(model.modelKey)).length;
      const modelsRemoved = existingModels.filter((model) => !nextKeys.has(model.modelKey)).length;

      if (syncResult.deleted !== modelsRemoved) {
        this.logger.warn(
          `syncModels: deleted count ${String(syncResult.deleted)} did not match computed removed count ${String(modelsRemoved)}`,
        );
      }

      this.logger.debug('syncModels: updating sync run as COMPLETED');
      await this.syncRunsRepository.update(syncRun.id, {
        status: ModelSyncStatus.COMPLETED,
        modelsFound: models.length,
        modelsAdded,
        modelsRemoved,
        completedAt: new Date(),
      });

      this.logger.log(
        `syncModels: completed - found=${String(models.length)} added=${String(modelsAdded)} removed=${String(modelsRemoved)}`,
      );
      return { modelsFound: models.length, modelsAdded, modelsRemoved };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      this.logger.error(`syncModels: failed for connector ${connector.id} - ${errorMessage}`);
      this.logger.debug('syncModels: updating sync run as FAILED');
      await this.syncRunsRepository.update(syncRun.id, {
        status: ModelSyncStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      });
      throw error;
    }
  }

  getDecryptedConfig(connector: Connector): ConnectorConfig {
    this.logger.debug(`getDecryptedConfig: decrypting config for connector ${connector.id}`);
    const config = AppConfig.get();
    const apiKey = connector.encryptedConfig
      ? decrypt(connector.encryptedConfig, config.ENCRYPTION_KEY)
      : '';
    this.logger.debug(
      `getDecryptedConfig: config decrypted — hasApiKey=${String(apiKey.length > 0)} baseUrl=${connector.baseUrl ?? 'default'}`,
    );

    return {
      provider: connector.provider,
      apiKey,
      baseUrl: connector.baseUrl ?? undefined,
      region: connector.region ?? undefined,
      workspaceId: connector.workspaceId ?? undefined,
    };
  }
}
