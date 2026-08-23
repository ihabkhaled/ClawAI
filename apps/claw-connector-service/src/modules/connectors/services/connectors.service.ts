import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { RabbitMQService, StructuredLogger } from '@claw/shared-rabbitmq';
import { EventPattern, LogLevel, type ModelBehaviorProbeResult } from '@claw/shared-types';
import { type Connector, type ConnectorModel, ConnectorProvider } from '../../../generated/prisma';
import { AppConfig } from '../../../app/config/app.config';
import { encrypt } from '../../../common/utilities';
import { EntityNotFoundException } from '../../../common/errors';
import { type PaginatedResult } from '../../../common/types';
import { ConnectorsRepository } from '../repositories/connectors.repository';
import { ConnectorModelsRepository } from '../repositories/connector-models.repository';
import { ConnectorsManager } from '../managers/connectors.manager';
import { type CreateConnectorDto } from '../dto/create-connector.dto';
import { type UpdateConnectorDto } from '../dto/update-connector.dto';
import { type ListConnectorsQueryDto } from '../dto/list-connectors-query.dto';
import {
  type ConnectorConfigResult,
  type ConnectorHealthSnapshotResult,
  type ConnectorWithModels,
  type HealthCheckResult,
  type SyncModelsResult,
} from '../types/connectors.types';

@Injectable()
export class ConnectorsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ConnectorsService.name);
  private readonly structuredLogger: StructuredLogger;

  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly connectorModelsRepository: ConnectorModelsRepository,
    private readonly connectorsManager: ConnectorsManager,
    private readonly rabbitMQService: RabbitMQService,
  ) {
    this.structuredLogger = new StructuredLogger(
      this.rabbitMQService,
      'connector-service',
      EventPattern.LOG_SERVER,
      ConnectorsService.name,
    );
  }

  async onApplicationBootstrap(): Promise<void> {
    const connectors = await this.connectorsRepository.findEnabled();
    const cloudConnectors = connectors.filter(
      ({ provider }) =>
        provider !== ConnectorProvider.OLLAMA && provider !== ConnectorProvider.LLAMACPP,
    );

    this.logger.log(
      `onApplicationBootstrap: checking ${String(cloudConnectors.length)} enabled cloud connectors`,
    );
    const results = await Promise.allSettled(
      cloudConnectors.map(async (connector) => {
        const result = await this.connectorsManager.testConnector(connector);
        await this.publishHealthResult(connector, result);
      }),
    );
    const failed = results.filter(({ status }) => status === 'rejected').length;
    if (failed > 0) {
      this.logger.warn(
        `onApplicationBootstrap: ${String(failed)} cloud connector health checks failed`,
      );
    }
  }

  async getHealthSnapshot(): Promise<ConnectorHealthSnapshotResult> {
    const connectors = await this.connectorsRepository.findEnabled();
    return {
      connectors: connectors
        .filter(
          ({ provider }) =>
            provider !== ConnectorProvider.OLLAMA && provider !== ConnectorProvider.LLAMACPP,
        )
        .map(({ provider, status }) => ({ provider, status })),
      generatedAt: new Date().toISOString(),
    };
  }

  async createConnector(dto: CreateConnectorDto): Promise<ConnectorWithModels> {
    this.logger.log(`createConnector: creating connector "${dto.name}" provider=${dto.provider}`);
    const encryptedConfig = dto.apiKey
      ? encrypt(dto.apiKey, AppConfig.get().ENCRYPTION_KEY)
      : undefined;

    const connector = await this.connectorsRepository.create({
      name: dto.name,
      provider: dto.provider,
      authType: dto.authType,
      encryptedConfig,
      baseUrl: dto.baseUrl,
      region: dto.region,
    });

    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: `Connector created: ${dto.name} (${dto.provider})`,
      action: 'connector_created',
      service: ConnectorsService.name,
      connectorId: connector.id,
      provider: dto.provider,
    });

    void this.rabbitMQService.publish(EventPattern.CONNECTOR_CREATED, {
      connectorId: connector.id,
      provider: connector.provider,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `createConnector: completed — connectorId=${connector.id}, provider=${dto.provider}`,
    );
    return { ...connector, _count: { models: 0 } };
  }

  async getConnectors(
    query: ListConnectorsQueryDto,
  ): Promise<PaginatedResult<ConnectorWithModels>> {
    this.logger.debug(
      `getConnectors: listing — page=${String(query.page)}, limit=${String(query.limit)}, provider=${query.provider ?? 'all'}`,
    );
    const filters = {
      provider: query.provider,
      status: query.status,
      isEnabled: query.isEnabled,
      search: query.search,
    };

    const [connectors, total] = await Promise.all([
      this.connectorsRepository.findAll(filters, query.page, query.limit),
      this.connectorsRepository.countAll(filters),
    ]);

    const safeConnectors = connectors.map((c) => this.maskSecrets(c));

    return {
      data: safeConnectors,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getConnector(id: string): Promise<ConnectorWithModels> {
    this.logger.debug(`getConnector: fetching connector ${id}`);
    const connector = await this.connectorsRepository.findById(id);
    if (!connector) {
      throw new EntityNotFoundException('Connector', id);
    }
    this.logger.debug(
      `getConnector: found connector ${id} "${connector.name}" (${connector.provider})`,
    );
    return this.maskSecrets({ ...connector, _count: { models: 0 } });
  }

  async updateConnector(id: string, dto: UpdateConnectorDto): Promise<ConnectorWithModels> {
    this.logger.log(`updateConnector: updating connector ${id}`);
    const connector = await this.connectorsRepository.findById(id);
    if (!connector) {
      throw new EntityNotFoundException('Connector', id);
    }

    const encryptedConfig = dto.apiKey
      ? encrypt(dto.apiKey, AppConfig.get().ENCRYPTION_KEY)
      : undefined;

    const updated = await this.connectorsRepository.update(id, {
      name: dto.name,
      provider: dto.provider,
      authType: dto.authType,
      encryptedConfig,
      baseUrl: dto.baseUrl,
      region: dto.region,
      isEnabled: dto.isEnabled,
    });

    void this.rabbitMQService.publish(EventPattern.CONNECTOR_UPDATED, {
      connectorId: updated.id,
      provider: updated.provider,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`updateConnector: completed — connectorId=${id}, provider=${updated.provider}`);
    return this.maskSecrets({ ...updated, _count: { models: 0 } });
  }

  async deleteConnector(id: string): Promise<ConnectorWithModels> {
    this.logger.log(`deleteConnector: deleting connector ${id}`);
    const connector = await this.connectorsRepository.findById(id);
    if (!connector) {
      throw new EntityNotFoundException('Connector', id);
    }

    const deleted = await this.connectorsRepository.delete(id);

    void this.rabbitMQService.publish(EventPattern.CONNECTOR_DELETED, {
      connectorId: deleted.id,
      provider: deleted.provider,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`deleteConnector: completed — connectorId=${id}, provider=${deleted.provider}`);
    return { ...deleted, _count: { models: 0 } };
  }

  async probeModelToolCapability(id: string, modelKey: string): Promise<ModelBehaviorProbeResult> {
    const connector = await this.connectorsRepository.findById(id);
    if (!connector) {
      throw new EntityNotFoundException('Connector', id);
    }
    return this.connectorsManager.probeModelToolCapability(connector, modelKey);
  }

  async testConnector(id: string): Promise<HealthCheckResult> {
    this.logger.log(`testConnector: testing connector ${id}`);
    const connector = await this.connectorsRepository.findById(id);
    if (!connector) {
      throw new EntityNotFoundException('Connector', id);
    }

    const result = await this.connectorsManager.testConnector(connector);

    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: `Connector test result: ${result.status} (${String(result.latencyMs)}ms)`,
      action: 'connector_test_connection',
      service: ConnectorsService.name,
      connectorId: connector.id,
      provider: connector.provider,
      latencyMs: result.latencyMs,
      metadata: { status: result.status },
    });

    await this.publishHealthResult(connector, result);

    return result;
  }

  private async publishHealthResult(
    connector: Connector,
    result: HealthCheckResult,
  ): Promise<void> {
    await this.rabbitMQService.publish(EventPattern.CONNECTOR_HEALTH_CHECKED, {
      connectorId: connector.id,
      provider: connector.provider,
      status: result.status,
      latencyMs: result.latencyMs,
      timestamp: new Date().toISOString(),
    });
  }

  async syncModels(id: string): Promise<SyncModelsResult> {
    this.logger.log(`syncModels: syncing models for connector ${id}`);
    const connector = await this.connectorsRepository.findById(id);
    if (!connector) {
      throw new EntityNotFoundException('Connector', id);
    }

    const result = await this.connectorsManager.syncModels(connector);

    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: `Models synced: ${String(result.modelsFound)} found, ${String(result.modelsAdded)} added, ${String(result.modelsRemoved)} removed`,
      action: 'connector_sync_models',
      service: ConnectorsService.name,
      connectorId: connector.id,
      provider: connector.provider,
      metadata: {
        modelsFound: result.modelsFound,
        modelsAdded: result.modelsAdded,
        modelsRemoved: result.modelsRemoved,
      },
    });

    void this.rabbitMQService.publish(EventPattern.CONNECTOR_SYNCED, {
      connectorId: connector.id,
      provider: connector.provider,
      modelsFound: result.modelsFound,
      modelsAdded: result.modelsAdded,
      modelsRemoved: result.modelsRemoved,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  async getConnectorConfig(provider: string): Promise<ConnectorConfigResult> {
    this.logger.debug(`getConnectorConfig: fetching config for provider=${provider}`);
    const connector = await this.connectorsRepository.findByProvider(provider);
    if (!connector) {
      throw new EntityNotFoundException('Connector', provider);
    }
    return this.connectorsManager.getDecryptedConfig(connector);
  }

  async getModels(connectorId: string): Promise<ConnectorModel[]> {
    this.logger.debug(`getModels: fetching models for connector ${connectorId}`);
    const connector = await this.connectorsRepository.findById(connectorId);
    if (!connector) {
      throw new EntityNotFoundException('Connector', connectorId);
    }
    const models = await this.connectorModelsRepository.findByConnectorId(connectorId);
    this.logger.debug(
      `getModels: returned ${String(models.length)} models for connector ${connectorId}`,
    );
    return models;
  }

  // USER-facing model catalog for the chat picker: every ACTIVE model from
  // enabled connectors, with NO connector config/secrets. Gated by
  // MODEL_USE_ALLOWED (not connector-admin) so normal users can pick cloud
  // models without seeing the connector management surface.
  //
  // IMPORTANT — same list for every plan tier:
  // This endpoint returns the SAME model list to ALL users regardless of plan.
  // Plan-tier restrictions on model SELECTION are an admin-only surface managed
  // via PlanModelAccess (claw-auth-service). When that table has zero rows for
  // a plan (the default), every plan sees every connector model — see the
  // contract comment in claw-auth-service EntitlementsService.getForUser. The
  // ThreadSettings and MessageComposer model selectors both consume this list
  // unmodified; plan features (compare/judge/critic/research) gate WORKFLOWS,
  // never which model the user can pick.
  async getAvailableModels(): Promise<ConnectorModel[]> {
    this.logger.debug('getAvailableModels: listing exposed chat models');
    const rows = await this.connectorModelsRepository.findExposedForCatalog();
    return rows.map(({ connector: _connector, ...model }) => model);
  }

  // Admin exposure control. The connector is verified first so a bad id fails as
  // NOT FOUND rather than silently updating nothing, and the previously exposed
  // keys are captured before the write so the caller can report what an unexpose
  // actually took away. setExposure only touches rows that already exist and are
  // not REMOVED, so a forged modelKey changes nothing.
  async setModelExposure(
    connectorId: string,
    modelKeys: string[],
    exposed: boolean,
  ): Promise<{ updated: number; previouslyExposed: string[] }> {
    const connector = await this.connectorsRepository.findById(connectorId);
    if (!connector) {
      throw new EntityNotFoundException('Connector', connectorId);
    }
    const previouslyExposed = await this.connectorModelsRepository.findExposedKeys(
      connectorId,
      modelKeys,
    );
    const { updated } = await this.connectorModelsRepository.setExposure(
      connectorId,
      modelKeys,
      exposed,
    );
    this.logger.log(
      `setModelExposure: connector=${connectorId} exposed=${String(exposed)} requested=${String(modelKeys.length)} updated=${String(updated)}`,
    );
    // Exposure decides what ClawAI offers to everyone, so who changed it and
    // what it took away has to be recoverable later. previouslyExposed is the
    // before-state: on an unexpose it names exactly what stopped being
    // available, which a count alone would not tell an investigator.
    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: `Model exposure ${exposed ? 'granted' : 'revoked'} on connector ${connectorId}`,
      action: exposed ? 'model_exposure_granted' : 'model_exposure_revoked',
      service: ConnectorsService.name,
      connectorId,
      metadata: { requestedModelKeys: modelKeys, previouslyExposed, updated },
    });

    // Consumers cache exposure to keep the check off the message hot path. This
    // is what tells them to drop that cache, so an unexpose takes effect while
    // the administrator is still on the screen rather than up to a TTL later.
    // Fire-and-forget: a missed event costs at most one cache lifetime, and
    // blocking the administrator's request on the broker would be worse.
    void this.rabbitMQService.publish(EventPattern.CONNECTOR_MODEL_EXPOSURE_CHANGED, {
      connectorId,
      modelKeys,
      exposed,
      updated,
      timestamp: new Date().toISOString(),
    });
    return { updated, previouslyExposed };
  }

  // Internal contract for auth-service. Returns only the pairs that are
  // currently offerable. It deliberately does not say WHY a pair was rejected:
  // this endpoint is reachable service-to-service and must not become a way to
  // probe which models exist but are hidden.
  async validateExposedModels(
    pairs: Array<{ provider: string; model: string }>,
  ): Promise<{ valid: Array<{ provider: string; model: string }> }> {
    const valid = await this.connectorModelsRepository.findExposedPairs(pairs);
    this.logger.debug(
      `validateExposedModels: requested=${String(pairs.length)} valid=${String(valid.length)}`,
    );
    return { valid };
  }

  private maskSecrets<T extends { encryptedConfig?: string | null }>(connector: T): T {
    if (connector.encryptedConfig) {
      return { ...connector, encryptedConfig: '****' };
    }
    return connector;
  }
}
