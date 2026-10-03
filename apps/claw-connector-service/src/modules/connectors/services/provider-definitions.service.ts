import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  BusinessException,
  DuplicateEntityException,
  EntityNotFoundException,
} from '../../../common/errors';
import { type PaginatedResult } from '../../../common/types';
import {
  type ConnectorProvider,
  type ConnectorProviderDefinition,
  type Prisma,
  ProviderAdapterFamily,
} from '../../../generated/prisma';
import { EventPattern, LogLevel } from '@claw/shared-types';
import { RabbitMQService, StructuredLogger } from '@claw/shared-rabbitmq';
import { ProviderDefinitionsRepository } from '../repositories/provider-definitions.repository';
import { type CreateProviderDefinitionDto } from '../dto/create-provider-definition.dto';
import { type ListProviderDefinitionsQueryDto } from '../dto/list-provider-definitions-query.dto';
import { type UpdateProviderDefinitionDto } from '../dto/update-provider-definition.dto';
import {
  type ProviderDefinitionActor,
  type ProviderDefinitionDependencies,
  type ProviderDefinitionListItem,
  type ProviderDefinitionRecord,
} from '../types/provider-definition.types';

@Injectable()
export class ProviderDefinitionsService {
  private readonly logger = new Logger(ProviderDefinitionsService.name);
  private readonly auditLogger: StructuredLogger;

  constructor(
    private readonly repository: ProviderDefinitionsRepository,
    rabbitMQService: RabbitMQService,
  ) {
    this.auditLogger = new StructuredLogger(
      rabbitMQService,
      'connector-service',
      EventPattern.LOG_SERVER,
      ProviderDefinitionsService.name,
    );
  }

  async list(
    query: ListProviderDefinitionsQueryDto,
  ): Promise<PaginatedResult<ProviderDefinitionListItem>> {
    const filters = {
      search: query.search,
      isActive: query.status === undefined ? undefined : query.status === 'ACTIVE',
      isBuiltIn: query.builtIn,
      adapterFamily: query.adapterFamily,
    };
    const [rows, total] = await Promise.all([
      this.repository.findPage(filters, query.page, query.limit),
      this.repository.count(filters),
    ]);
    return {
      data: rows.map((row) => this.toListItem(row)),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async get(id: string): Promise<ProviderDefinitionListItem> {
    return this.toListItem(await this.requireDefinition(id));
  }

  async create(
    dto: CreateProviderDefinitionDto,
    actor: ProviderDefinitionActor,
  ): Promise<ProviderDefinitionListItem> {
    if (await this.repository.findByKey(dto.key)) {
      throw new DuplicateEntityException('Connector provider', 'key');
    }
    if (dto.adapterFamily !== ProviderAdapterFamily.OPENAI_COMPATIBLE) {
      throw new BusinessException('Unsupported adapter family', 'PROVIDER_ADAPTER_UNSUPPORTED');
    }
    const data: Prisma.ConnectorProviderDefinitionCreateInput = {
      ...dto,
      adapterFamily: ProviderAdapterFamily.OPENAI_COMPATIBLE,
      isBuiltIn: false,
      createdBy: actor.id,
      updatedBy: actor.id,
    };
    const row = await this.repository.create(data);
    this.logMutation(actor, row.key, 'provider_definition_created', ['definition']);
    this.logger.log(`create: provider definition created key=${row.key}`);
    return this.toListItem(await this.requireDefinition(row.id));
  }

  async update(
    id: string,
    dto: UpdateProviderDefinitionDto,
    actor: ProviderDefinitionActor,
  ): Promise<ProviderDefinitionListItem> {
    if (
      dto.adapterFamily !== undefined &&
      dto.adapterFamily !== ProviderAdapterFamily.OPENAI_COMPATIBLE
    ) {
      throw new BusinessException('Unsupported adapter family', 'PROVIDER_ADAPTER_UNSUPPORTED');
    }
    const current = await this.requireDefinition(id);
    if (current.isBuiltIn) {
      throw new BusinessException(
        'Built-in provider definitions are protected',
        'PROVIDER_BUILT_IN',
      );
    }
    if (current._count.connectors > 0 && this.changesExecutionConfig(current, dto)) {
      throw new BusinessException(
        'Execution settings cannot change while connectors use this provider',
        'PROVIDER_IN_USE',
        HttpStatus.CONFLICT,
      );
    }
    const data: Prisma.ConnectorProviderDefinitionUpdateInput = {
      ...dto,
      updatedBy: actor.id,
    };
    const row = await this.repository.update(id, data);
    this.logMutation(actor, row.key, 'provider_definition_updated', Object.keys(dto));
    return this.toListItem(await this.requireDefinition(row.id));
  }

  async setActive(
    id: string,
    isActive: boolean,
    actor: ProviderDefinitionActor,
  ): Promise<ProviderDefinitionListItem> {
    const current = await this.requireDefinition(id);
    const row = await this.repository.update(id, { isActive, updatedBy: actor.id });
    this.logMutation(
      actor,
      current.key,
      isActive ? 'provider_definition_activated' : 'provider_definition_deactivated',
      ['isActive'],
    );
    return this.toListItem(await this.requireDefinition(row.id));
  }

  async remove(id: string, actor: ProviderDefinitionActor): Promise<void> {
    const current = await this.requireDefinition(id);
    if (current.isBuiltIn) {
      throw new BusinessException(
        'Built-in provider definitions cannot be deleted',
        'PROVIDER_BUILT_IN',
      );
    }
    const dependencies = this.dependencies(current);
    if (current.everConnected || dependencies.connectorCount > 0 || dependencies.modelCount > 0) {
      throw new HttpException(
        { message: 'Provider is in use', code: 'PROVIDER_IN_USE', statusCode: 409, dependencies },
        HttpStatus.CONFLICT,
      );
    }
    await this.repository.delete(id);
    this.logMutation(actor, current.key, 'provider_definition_deleted', ['definition']);
  }

  async findRuntimeDefinition(key: string): Promise<ConnectorProviderDefinition | null> {
    const row = await this.repository.findByKey(key.toUpperCase());
    return !row?.isActive ? null : row;
  }

  async findBuiltInByProvider(
    provider: ConnectorProvider,
  ): Promise<ConnectorProviderDefinition | null> {
    return this.repository.findByConnectorProvider(provider);
  }

  async findActiveById(id: string): Promise<ConnectorProviderDefinition> {
    const row = await this.requireDefinition(id);
    if (!row.isActive) {
      throw new BusinessException('Provider is inactive', 'PROVIDER_INACTIVE', HttpStatus.CONFLICT);
    }
    return row;
  }

  async findById(id: string): Promise<ConnectorProviderDefinition> {
    return this.requireDefinition(id);
  }

  private async requireDefinition(id: string): Promise<ProviderDefinitionRecord> {
    const row = await this.repository.findById(id);
    if (row === null) {
      throw new EntityNotFoundException('Connector provider', id);
    }
    return row;
  }

  private toListItem(row: ProviderDefinitionRecord): ProviderDefinitionListItem {
    return {
      id: row.id,
      key: row.key,
      displayName: row.displayName,
      description: row.description,
      adapterFamily: row.adapterFamily,
      connectorProvider: row.connectorProvider,
      defaultBaseUrl: row.defaultBaseUrl,
      modelsEndpoint: row.modelsEndpoint,
      modelsResponseFormat: row.modelsResponseFormat,
      healthCheckEndpoint: row.healthCheckEndpoint,
      authType: row.authType,
      supportsNativeTools: row.supportsNativeTools,
      supportsVision: row.supportsVision,
      registerUrl: row.registerUrl,
      apiKeyUrl: row.apiKeyUrl,
      pricingUrl: row.pricingUrl,
      docsUrl: row.docsUrl,
      defaultIsPayAsYouGo: row.defaultIsPayAsYouGo,
      hasFreeTier: row.hasFreeTier,
      isActive: row.isActive,
      isBuiltIn: row.isBuiltIn,
      everConnected: row.everConnected,
      capabilityDefaults: row.capabilityDefaults,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      connectorCount: row._count.connectors,
      modelCount: row.connectors.reduce((total, connector) => total + connector._count.models, 0),
    };
  }

  private changesExecutionConfig(
    current: ProviderDefinitionRecord,
    dto: UpdateProviderDefinitionDto,
  ): boolean {
    return (
      (dto.adapterFamily !== undefined && dto.adapterFamily !== current.adapterFamily) ||
      (dto.defaultBaseUrl !== undefined && dto.defaultBaseUrl !== current.defaultBaseUrl) ||
      (dto.modelsEndpoint !== undefined && dto.modelsEndpoint !== current.modelsEndpoint) ||
      (dto.modelsResponseFormat !== undefined &&
        dto.modelsResponseFormat !== current.modelsResponseFormat)
    );
  }

  private dependencies(row: ProviderDefinitionRecord): ProviderDefinitionDependencies {
    return {
      connectorCount: row._count.connectors,
      modelCount: row.connectors.reduce((total, connector) => total + connector._count.models, 0),
    };
  }

  private logMutation(
    actor: ProviderDefinitionActor,
    provider: string,
    action: string,
    changedFields: string[],
  ): void {
    this.auditLogger.logAction({
      level: LogLevel.INFO,
      message: `Provider definition ${action}: ${provider}`,
      action,
      service: ProviderDefinitionsService.name,
      provider,
      userId: actor.id,
      metadata: { changedFields },
    });
  }
}
