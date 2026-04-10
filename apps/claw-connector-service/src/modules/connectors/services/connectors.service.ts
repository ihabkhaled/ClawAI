import { Injectable, Logger } from "@nestjs/common";
import { RabbitMQService, StructuredLogger } from "@claw/shared-rabbitmq";
import { EventPattern, LogLevel } from "@claw/shared-types";
import { type ConnectorModel } from "../../../generated/prisma";
import { AppConfig } from "../../../app/config/app.config";
import { encrypt } from "../../../common/utilities";
import { EntityNotFoundException } from "../../../common/errors";
import { type PaginatedResult } from "../../../common/types";
import { ConnectorsRepository } from "../repositories/connectors.repository";
import { ConnectorModelsRepository } from "../repositories/connector-models.repository";
import { ConnectorsManager } from "../managers/connectors.manager";
import { type CreateConnectorDto } from "../dto/create-connector.dto";
import { type UpdateConnectorDto } from "../dto/update-connector.dto";
import { type ListConnectorsQueryDto } from "../dto/list-connectors-query.dto";
import {
  type ConnectorConfigResult,
  type ConnectorWithModels,
  type HealthCheckResult,
  type SyncModelsResult,
} from "../types/connectors.types";

@Injectable()
export class ConnectorsService {
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

    return { ...connector, _count: { models: 0 } };
  }

  async getConnectors(
    query: ListConnectorsQueryDto,
  ): Promise<PaginatedResult<ConnectorWithModels>> {
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
    const connector = await this.connectorsRepository.findById(id);
    if (!connector) {
      throw new EntityNotFoundException("Connector", id);
    }
    return this.maskSecrets({ ...connector, _count: { models: 0 } });
  }

  async updateConnector(id: string, dto: UpdateConnectorDto): Promise<ConnectorWithModels> {
    this.logger.log(`updateConnector: updating connector ${id}`);
    const connector = await this.connectorsRepository.findById(id);
    if (!connector) {
      throw new EntityNotFoundException("Connector", id);
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

    return this.maskSecrets({ ...updated, _count: { models: 0 } });
  }

  async deleteConnector(id: string): Promise<ConnectorWithModels> {
    this.logger.log(`deleteConnector: deleting connector ${id}`);
    const connector = await this.connectorsRepository.findById(id);
    if (!connector) {
      throw new EntityNotFoundException("Connector", id);
    }

    const deleted = await this.connectorsRepository.delete(id);

    void this.rabbitMQService.publish(EventPattern.CONNECTOR_DELETED, {
      connectorId: deleted.id,
      provider: deleted.provider,
      timestamp: new Date().toISOString(),
    });

    return { ...deleted, _count: { models: 0 } };
  }

  async testConnector(id: string): Promise<HealthCheckResult> {
    this.logger.log(`testConnector: testing connector ${id}`);
    const connector = await this.connectorsRepository.findById(id);
    if (!connector) {
      throw new EntityNotFoundException("Connector", id);
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

    void this.rabbitMQService.publish(EventPattern.CONNECTOR_HEALTH_CHECKED, {
      connectorId: connector.id,
      status: result.status,
      latencyMs: result.latencyMs,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  async syncModels(id: string): Promise<SyncModelsResult> {
    this.logger.log(`syncModels: syncing models for connector ${id}`);
    const connector = await this.connectorsRepository.findById(id);
    if (!connector) {
      throw new EntityNotFoundException("Connector", id);
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
      throw new EntityNotFoundException("Connector", provider);
    }
    return this.connectorsManager.getDecryptedConfig(connector);
  }

  async getModels(connectorId: string): Promise<ConnectorModel[]> {
    const connector = await this.connectorsRepository.findById(connectorId);
    if (!connector) {
      throw new EntityNotFoundException("Connector", connectorId);
    }
    return this.connectorModelsRepository.findByConnectorId(connectorId);
  }

  private maskSecrets<T extends { encryptedConfig?: string | null }>(connector: T): T {
    if (connector.encryptedConfig) {
      return { ...connector, encryptedConfig: "****" };
    }
    return connector;
  }
}
