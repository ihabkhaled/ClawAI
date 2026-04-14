import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { WorkspaceConnectorRepository } from '../repositories/workspace-connector.repository';
import { WorkspaceAdapterFactory } from '../adapters/workspace-adapter.factory';
import { OAuthTokenManager } from '../managers/oauth-token.manager';
import { WorkspaceHealthManager } from '../managers/workspace-health.manager';
import { WorkspaceSyncManager } from '../managers/workspace-sync.manager';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import { OAUTH_PROVIDERS } from '../../../common/constants/workspace.constants';
import type { CreateWorkspaceConnectorDto } from '../dto/create-workspace-connector.dto';
import type { UpdateWorkspaceConnectorDto } from '../dto/update-workspace-connector.dto';
import type { ListWorkspaceConnectorsQueryDto } from '../dto/list-workspace-connectors-query.dto';
import type { OAuthInitDto } from '../dto/oauth-init.dto';
import type { OAuthCallbackDto } from '../dto/oauth-callback.dto';
import type { Prisma } from '../../../generated/prisma';
import type {
  HealthCheckResult,
  OAuthInitResult,
  PaginatedWorkspaceConnectors,
  SyncResult,
  WorkspaceConnectorWithStats,
} from '../types/workspace.types';
import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

@Injectable()
export class WorkspaceConnectorService {
  private readonly logger = new Logger(WorkspaceConnectorService.name);

  constructor(
    private readonly repository: WorkspaceConnectorRepository,
    private readonly adapterFactory: WorkspaceAdapterFactory,
    private readonly tokenManager: OAuthTokenManager,
    private readonly healthManager: WorkspaceHealthManager,
    private readonly syncManager: WorkspaceSyncManager,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async create(
    userId: string,
    dto: CreateWorkspaceConnectorDto,
  ): Promise<WorkspaceConnectorWithStats> {
    const encryptedTokens = dto.accessToken
      ? this.tokenManager.encryptTokenSet({
          accessToken: dto.accessToken,
          refreshToken: dto.refreshToken,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          scopes: dto.scopes,
        })
      : undefined;

    const connector = await this.repository.create({
      userId,
      name: dto.name,
      provider: dto.provider,
      permissionLevel: dto.permissionLevel,
      encryptedTokens,
      scopes: dto.scopes,
      status: encryptedTokens
        ? WorkspaceConnectorStatus.UNKNOWN
        : WorkspaceConnectorStatus.PENDING_AUTH,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    });

    void this.publishEvent(EventPattern.WORKSPACE_CONNECTOR_CREATED, {
      connectorId: connector.id,
      provider: connector.provider,
      name: connector.name,
      userId,
    });
    this.logger.log(`Created workspace connector ${connector.id} (${connector.provider})`);
    return this.getConnector(connector.id, userId);
  }

  async getConnectors(
    userId: string,
    query: ListWorkspaceConnectorsQueryDto,
  ): Promise<PaginatedWorkspaceConnectors> {
    return this.repository.findAllByUser(userId, query);
  }

  async getConnector(id: string, userId: string): Promise<WorkspaceConnectorWithStats> {
    const connector = await this.repository.findByIdWithStats(id);
    if (connector === null) {
      throw new EntityNotFoundException('WorkspaceConnector', id);
    }
    if (connector.userId !== userId) {
      throw new BusinessException(
        'workspace.connector.forbidden',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      );
    }
    return connector;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateWorkspaceConnectorDto,
  ): Promise<WorkspaceConnectorWithStats> {
    await this.getConnector(id, userId);
    const updateData: Prisma.WorkspaceConnectorUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.permissionLevel !== undefined ? { permissionLevel: dto.permissionLevel } : {}),
      ...(dto.scopes !== undefined ? { scopes: dto.scopes } : {}),
      ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : {}),
      ...(dto.metadata !== undefined ? { metadata: dto.metadata as Prisma.InputJsonValue } : {}),
    };
    await this.repository.update(id, updateData);
    void this.publishEvent(EventPattern.WORKSPACE_CONNECTOR_UPDATED, {
      connectorId: id,
      changes: dto as Record<string, unknown>,
      userId,
    });
    return this.getConnector(id, userId);
  }

  async delete(id: string, userId: string): Promise<WorkspaceConnectorWithStats> {
    const connector = await this.getConnector(id, userId);
    await this.repository.delete(id);
    void this.publishEvent(EventPattern.WORKSPACE_CONNECTOR_DELETED, {
      connectorId: id,
      provider: connector.provider,
      userId,
    });
    return connector;
  }

  async testHealth(id: string, userId: string): Promise<HealthCheckResult> {
    const connector = await this.getConnector(id, userId);
    return this.healthManager.checkHealth(connector);
  }

  async triggerSync(id: string, userId: string, isDelta: boolean): Promise<SyncResult> {
    const connector = await this.getConnector(id, userId);
    if (connector.status === WorkspaceConnectorStatus.PENDING_AUTH) {
      throw new BusinessException(
        'workspace.connector.not_authorized',
        'NOT_AUTHORIZED',
        HttpStatus.CONFLICT,
      );
    }
    return this.syncManager.syncConnector(connector, isDelta);
  }

  async initOAuth(userId: string, dto: OAuthInitDto): Promise<OAuthInitResult> {
    if (!OAUTH_PROVIDERS.has(dto.provider)) {
      throw new BusinessException(
        'workspace.oauth.provider_not_supported',
        'OAUTH_NOT_SUPPORTED',
        HttpStatus.BAD_REQUEST,
      );
    }
    const adapter = this.adapterFactory.getAdapter(dto.provider);
    const scopes = dto.scopes.length > 0 ? dto.scopes : adapter.getDefaultScopes();
    return this.tokenManager.initOAuthFlow(
      userId,
      dto.provider,
      dto.redirectUri,
      adapter.getAuthorizationBaseUrl(),
      adapter.getClientId(),
      scopes,
    );
  }

  async handleOAuthCallback(
    userId: string,
    dto: OAuthCallbackDto,
  ): Promise<WorkspaceConnectorWithStats> {
    const stateData = await this.tokenManager.resolveOAuthState(dto.state);
    if (stateData?.userId !== userId) {
      throw new BusinessException(
        'workspace.oauth.invalid_state',
        'INVALID_OAUTH_STATE',
        HttpStatus.BAD_REQUEST,
      );
    }
    const adapter = this.adapterFactory.getAdapter(stateData.provider);
    const tokens = await adapter.exchangeCodeForTokens(
      dto.code,
      dto.redirectUri,
      stateData.verifier,
    );
    const encryptedTokens = this.tokenManager.encryptTokenSet(tokens);

    const connector = await this.repository.create({
      userId,
      name: `${stateData.provider} — ${new Date().toLocaleDateString()}`,
      provider: stateData.provider as WorkspaceProvider,
      status: WorkspaceConnectorStatus.CONNECTED,
      encryptedTokens,
      scopes: tokens.scopes,
      expiresAt: tokens.expiresAt,
    });

    void this.publishEvent(EventPattern.WORKSPACE_CONNECTOR_CREATED, {
      connectorId: connector.id,
      provider: connector.provider,
      name: connector.name,
      userId,
    });
    return this.getConnector(connector.id, userId);
  }

  private async publishEvent(
    pattern: EventPattern,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.rabbitMQ.publish(pattern, { ...payload, timestamp: new Date().toISOString() });
    } catch (error) {
      this.logger.error(
        `Failed to publish ${pattern}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
