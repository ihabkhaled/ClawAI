import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  EventPattern,
  type WorkspaceSyncManualTriggeredPayload,
  type WorkspaceSyncPausedPayload,
  type WorkspaceSyncResumedPayload,
} from '@claw/shared-types';
import { WorkspaceConnectorRepository } from '../repositories/workspace-connector.repository';
import { WorkspaceAdapterFactory } from '../adapters/workspace-adapter.factory';
import type { AdapterAppCredentials } from '../adapters/workspace-adapter.interface';
import { OAuthTokenManager } from '../managers/oauth-token.manager';
import { WorkspaceHealthManager } from '../managers/workspace-health.manager';
import { WorkspaceSyncManager } from '../managers/workspace-sync.manager';
import { ProviderAppConfigService } from './provider-app-config.service';
import {
  type Prisma,
  WorkspaceProviderAppConfigStatus,
  WorkspaceProviderAuthMode,
} from '../../../generated/prisma';
import {
  sanitizeConnector,
  sanitizeConnectors,
} from '../../../common/utilities/connector-sanitizer.utility';
import { assertSafeOutboundUrl } from '../../../common/utilities/url-safety.utility';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import { WorkspaceErrorCode } from '../../../common/enums/workspace-error-code.enum';
import { OAUTH_PROVIDERS } from '../../../common/constants/workspace.constants';
import type { CreateWorkspaceConnectorDto } from '../dto/create-workspace-connector.dto';
import type { UpdateWorkspaceConnectorDto } from '../dto/update-workspace-connector.dto';
import type { ListWorkspaceConnectorsQueryDto } from '../dto/list-workspace-connectors-query.dto';
import type { OAuthInitDto } from '../dto/oauth-init.dto';
import type { OAuthCallbackDto } from '../dto/oauth-callback.dto';
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
    private readonly providerAppConfigs: ProviderAppConfigService,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async create(
    userId: string,
    dto: CreateWorkspaceConnectorDto,
  ): Promise<WorkspaceConnectorWithStats> {
    if (OAUTH_PROVIDERS.has(dto.provider) && dto.accessToken === undefined) {
      throw new BusinessException(
        'workspace.connector.oauth_requires_flow',
        WorkspaceErrorCode.OAUTH_REQUIRED,
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.warn(
      `DEPRECATED: POST /workspace/connectors (admin/test path) used by user ${userId} ` +
        `for ${dto.provider}. Preferred flow is /workspace/oauth/init → /workspace/oauth/callback.`,
    );

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
    return sanitizeConnector(await this.getConnectorRaw(connector.id, userId));
  }

  async getConnectors(
    userId: string,
    query: ListWorkspaceConnectorsQueryDto,
  ): Promise<PaginatedWorkspaceConnectors> {
    return sanitizeConnectors(await this.repository.findAllByUser(userId, query));
  }

  async getConnector(id: string, userId: string): Promise<WorkspaceConnectorWithStats> {
    return sanitizeConnector(await this.getConnectorRaw(id, userId));
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateWorkspaceConnectorDto,
  ): Promise<WorkspaceConnectorWithStats> {
    await this.getConnectorRaw(id, userId);
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
    return sanitizeConnector(await this.getConnectorRaw(id, userId));
  }

  async delete(id: string, userId: string): Promise<WorkspaceConnectorWithStats> {
    const connector = await this.getConnectorRaw(id, userId);
    await this.repository.delete(id);
    void this.publishEvent(EventPattern.WORKSPACE_CONNECTOR_DELETED, {
      connectorId: id,
      provider: connector.provider,
      userId,
    });
    return sanitizeConnector(connector);
  }

  async testHealth(id: string, userId: string): Promise<HealthCheckResult> {
    const fullConnector = await this.getConnectorRaw(id, userId);
    return this.healthManager.checkHealth(fullConnector);
  }

  async triggerSync(
    id: string,
    userId: string,
    options: { delta: boolean; priority?: boolean; dryRun?: boolean },
  ): Promise<SyncResult & { reusedInFlight?: boolean; reusedRunId?: string | null }> {
    const fullConnector = await this.getConnectorRaw(id, userId);
    this.assertSyncable(fullConnector);

    const existing = await this.repository.findInFlightRun(id);
    if (existing !== null) {
      await this.publishManualTriggered(fullConnector, userId, options, existing.id);
      return {
        objectsFound: existing.objectsFound,
        objectsSynced: existing.objectsSynced,
        objectsFailed: existing.objectsFailed,
        objects: [],
        deltaTokenOut: existing.deltaTokenOut ?? undefined,
        errorMessage: undefined,
        reusedInFlight: true,
        reusedRunId: existing.id,
      };
    }

    await this.publishManualTriggered(fullConnector, userId, options, null);
    return this.syncManager.syncConnector(fullConnector, options.delta, {
      triggeredBy: options.priority === true ? 'priority' : 'manual',
      isDryRun: options.dryRun === true,
      actorUserId: userId,
    });
  }

  async updateCadence(
    id: string,
    userId: string,
    intervalSeconds: number,
  ): Promise<WorkspaceConnectorWithStats> {
    await this.getConnectorRaw(id, userId);
    await this.repository.updateCadence(id, intervalSeconds);
    void this.publishEvent(EventPattern.WORKSPACE_CONNECTOR_UPDATED, {
      connectorId: id,
      changes: { syncIntervalSeconds: intervalSeconds },
      userId,
    });
    return sanitizeConnector(await this.getConnectorRaw(id, userId));
  }

  async pauseConnector(
    id: string,
    userId: string,
    reason: string | null,
  ): Promise<WorkspaceConnectorWithStats> {
    const connector = await this.getConnectorRaw(id, userId);
    if (connector.status === WorkspaceConnectorStatus.PAUSED) {
      return sanitizeConnector(connector);
    }
    await this.repository.markPaused(id, reason);
    const payload: WorkspaceSyncPausedPayload = {
      connectorId: id,
      provider: connector.provider as WorkspaceProvider,
      actorUserId: userId,
      reason: 'user_requested',
      timestamp: new Date().toISOString(),
    };
    await this.publishEvent(EventPattern.WORKSPACE_SYNC_PAUSED, { ...payload });
    return sanitizeConnector(await this.getConnectorRaw(id, userId));
  }

  async resumeConnector(id: string, userId: string): Promise<WorkspaceConnectorWithStats> {
    const connector = await this.getConnectorRaw(id, userId);
    if (connector.status !== WorkspaceConnectorStatus.PAUSED) {
      return sanitizeConnector(connector);
    }
    await this.repository.markResumed(id);
    const payload: WorkspaceSyncResumedPayload = {
      connectorId: id,
      provider: connector.provider as WorkspaceProvider,
      actorUserId: userId,
      timestamp: new Date().toISOString(),
    };
    await this.publishEvent(EventPattern.WORKSPACE_SYNC_RESUMED, { ...payload });
    return sanitizeConnector(await this.getConnectorRaw(id, userId));
  }

  async initOAuth(userId: string, dto: OAuthInitDto): Promise<OAuthInitResult> {
    if (!OAUTH_PROVIDERS.has(dto.provider)) {
      throw new BusinessException(
        'workspace.oauth.provider_not_supported',
        'OAUTH_NOT_SUPPORTED',
        HttpStatus.BAD_REQUEST,
      );
    }
    const appConfig = await this.providerAppConfigs.getById(dto.providerAppConfigId);
    if (appConfig.provider !== dto.provider) {
      throw new BusinessException(
        'Provider app config does not match requested provider',
        'PROVIDER_APP_CONFIG_MISMATCH',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (appConfig.status !== WorkspaceProviderAppConfigStatus.READY) {
      throw new BusinessException(
        `Provider app config "${appConfig.name}" is not READY (status=${appConfig.status})`,
        'PROVIDER_APP_CONFIG_NOT_READY',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (appConfig.authMode !== WorkspaceProviderAuthMode.OAUTH2) {
      throw new BusinessException(
        `Provider app config "${appConfig.name}" is not configured for OAUTH2`,
        'PROVIDER_APP_CONFIG_NOT_OAUTH',
        HttpStatus.BAD_REQUEST,
      );
    }
    const publicConfig = appConfig.publicConfig as Record<string, unknown>;
    const clientId = typeof publicConfig['clientId'] === 'string' ? publicConfig['clientId'] : '';
    if (clientId.length === 0) {
      throw new BusinessException(
        `Provider app config is missing clientId`,
        'PROVIDER_APP_CONFIG_INVALID',
        HttpStatus.BAD_REQUEST,
      );
    }
    const adapter = this.adapterFactory.getAdapter(dto.provider);
    const scopes = dto.scopes.length > 0 ? dto.scopes : adapter.getDefaultScopes();
    const pkce = adapter.supportsPkce?.() ?? true;
    const extraParams = adapter.getExtraAuthParams?.() ?? {};
    return this.tokenManager.initOAuthFlow(
      userId,
      dto.provider,
      appConfig.id,
      dto.redirectUri,
      adapter.getAuthorizationBaseUrl(),
      clientId,
      scopes,
      { pkce, extraParams },
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
    const appConfig = await this.providerAppConfigs.getById(stateData.providerAppConfigId);
    if (appConfig.status !== WorkspaceProviderAppConfigStatus.READY) {
      throw new BusinessException(
        'The selected provider app config is no longer READY',
        'PROVIDER_APP_CONFIG_NOT_READY',
        HttpStatus.BAD_REQUEST,
      );
    }
    const adapterCreds = await this.buildAdapterCredentials(stateData.providerAppConfigId);
    const adapter = this.adapterFactory.getAdapter(stateData.provider);
    let tokens;
    try {
      tokens = await adapter.exchangeCodeForTokens(
        dto.code,
        dto.redirectUri,
        stateData.verifier,
        adapterCreds,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Token exchange failed';
      this.logger.warn(`OAuth exchange failed for ${stateData.provider}: ${message}`);
      throw new BusinessException(
        message,
        WorkspaceErrorCode.OAUTH_EXCHANGE_FAILED,
        HttpStatus.BAD_REQUEST,
      );
    }
    const encryptedTokens = this.tokenManager.encryptTokenSet(tokens);

    const connector = await this.repository.create({
      userId,
      name: `${stateData.provider} — ${appConfig.name}`,
      provider: stateData.provider as WorkspaceProvider,
      appConfig: { connect: { id: appConfig.id } },
      authMode: WorkspaceProviderAuthMode.OAUTH2,
      status: WorkspaceConnectorStatus.CONNECTED,
      encryptedTokens,
      tokenVersion: appConfig.secretVersion,
      scopes: tokens.scopes,
      expiresAt: tokens.expiresAt,
      lastAuthAt: new Date(),
    });

    void this.publishEvent(EventPattern.WORKSPACE_CONNECTOR_CREATED, {
      connectorId: connector.id,
      provider: connector.provider,
      name: connector.name,
      userId,
    });
    return sanitizeConnector(await this.getConnectorRaw(connector.id, userId));
  }

  /**
   * Validate a saved provider app config's credentials without triggering a
   * full OAuth authorization. Useful for "Test connection" buttons.
   *
   * For OAuth-only providers we can't hit the provider without a real access
   * token, so we return UNKNOWN with guidance. For PAT-based providers we
   * call `adapter.validatePat()` with the decrypted secret.
   */
  async testAppConfigConnection(input: {
    provider: WorkspaceProvider;
    providerAppConfigId: string;
  }): Promise<HealthCheckResult> {
    const creds = await this.buildAdapterCredentials(input.providerAppConfigId);
    const adapter = this.adapterFactory.getAdapter(input.provider);
    if (creds.personalAccessToken !== undefined && adapter.validatePat !== undefined) {
      return adapter.validatePat(creds.personalAccessToken, creds.baseUrl);
    }
    if (
      creds.clientId !== undefined &&
      creds.clientSecret !== undefined &&
      adapter.validateOAuthAppConfig !== undefined
    ) {
      return adapter.validateOAuthAppConfig(creds);
    }
    return {
      status: WorkspaceConnectorStatus.UNKNOWN,
      latencyMs: 0,
      errorMessage:
        'No credentials available to probe. Set either a personalAccessToken (PAT) or clientId+clientSecret (OAuth) for this provider app config.',
    };
  }

  /**
   * Validate a raw PAT without saving it. Adapter must implement `validatePat`.
   */
  async testPat(input: {
    provider: WorkspaceProvider;
    personalAccessToken: string;
    baseUrl?: string;
  }): Promise<HealthCheckResult> {
    const adapter = this.adapterFactory.getAdapter(input.provider);
    if (adapter.validatePat === undefined) {
      throw new BusinessException(
        `Provider ${input.provider} does not support PAT validation`,
        'PAT_NOT_SUPPORTED',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (input.baseUrl !== undefined) {
      try {
        // Admin-supplied baseUrl on a self-hosted deployment may legitimately
        // point at an internal host (self-hosted GitLab, Jira, Confluence).
        // Cloud metadata endpoints remain blocked.
        assertSafeOutboundUrl(input.baseUrl, { allowPrivateHosts: true });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unsafe URL';
        throw new BusinessException(message, 'UNSAFE_BASE_URL', HttpStatus.BAD_REQUEST);
      }
    }
    return adapter.validatePat(input.personalAccessToken, input.baseUrl);
  }

  /**
   * Build the per-call adapter credentials from a provider app config.
   * Reads `publicConfig` (clientId, redirectUri, baseUrl, tenantId, ...) and
   * the decrypted `secretConfig` (clientSecret, personalAccessToken, apiToken, ...).
   */
  async buildAdapterCredentials(providerAppConfigId: string): Promise<AdapterAppCredentials> {
    const appConfig = await this.providerAppConfigs.getById(providerAppConfigId);
    const publicConfig = appConfig.publicConfig as Record<string, unknown>;
    const secrets = (await this.providerAppConfigs.getDecryptedSecret(providerAppConfigId)) ?? {};

    const readString = (source: Record<string, unknown>, key: string): string | undefined => {
      const value = Object.entries(source).find(([k]) => k === key)?.[1];
      return typeof value === 'string' && value.length > 0 ? value : undefined;
    };

    return {
      clientId: readString(publicConfig, 'clientId'),
      clientSecret: readString(secrets, 'clientSecret'),
      personalAccessToken:
        readString(secrets, 'personalAccessToken') ?? readString(secrets, 'apiToken'),
      baseUrl: readString(publicConfig, 'apiBaseUrl') ?? readString(publicConfig, 'siteUrl'),
      tenantId: readString(publicConfig, 'tenantId'),
    };
  }

  private async getConnectorRaw(id: string, userId: string): Promise<WorkspaceConnectorWithStats> {
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

  private assertSyncable(connector: WorkspaceConnectorWithStats): void {
    if (connector.status === WorkspaceConnectorStatus.PENDING_AUTH) {
      throw new BusinessException(
        'workspace.connector.not_authorized',
        'NOT_AUTHORIZED',
        HttpStatus.CONFLICT,
      );
    }
    if (connector.status === WorkspaceConnectorStatus.PAUSED) {
      throw new BusinessException(
        'workspace.connector.paused',
        'CONNECTOR_PAUSED',
        HttpStatus.CONFLICT,
      );
    }
  }

  private async publishManualTriggered(
    connector: WorkspaceConnectorWithStats,
    userId: string,
    options: { priority?: boolean; dryRun?: boolean },
    reusedRunId: string | null,
  ): Promise<void> {
    const payload: WorkspaceSyncManualTriggeredPayload = {
      connectorId: connector.id,
      provider: connector.provider as WorkspaceProvider,
      actorUserId: userId,
      priority: options.priority ?? false,
      dryRun: options.dryRun ?? false,
      reusedInFlight: reusedRunId !== null,
      reusedRunId,
      timestamp: new Date().toISOString(),
    };
    await this.publishEvent(EventPattern.WORKSPACE_SYNC_MANUAL_TRIGGERED, { ...payload });
  }
}
