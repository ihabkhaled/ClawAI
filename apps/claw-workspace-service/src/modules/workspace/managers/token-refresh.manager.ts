import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import { WorkspaceConnectorRepository } from '../repositories/workspace-connector.repository';
import { WorkspaceAdapterFactory } from '../adapters/workspace-adapter.factory';
import { OAuthTokenManager } from './oauth-token.manager';
import { ProviderAppConfigService } from '../services/provider-app-config.service';
import type { AdapterAppCredentials } from '../adapters/workspace-adapter.interface';
import type { WorkspaceConnector } from '../../../generated/prisma';

/**
 * Retrieves a guaranteed-fresh access token for a connector.
 *
 * Strategy:
 *  - Decrypts the stored token set.
 *  - If not expired → returns the existing accessToken.
 *  - If expired and no refreshToken → marks connector DISCONNECTED and throws
 *    (requires user re-authorization).
 *  - If expired and refreshToken present → acquires a Redis advisory lock,
 *    calls adapter.refreshTokens(), persists the new encrypted token set,
 *    then releases the lock.
 *  - If the lock is already held by another process → the in-flight refresh
 *    is trusted; the stale token is returned for this request to avoid a
 *    stampede. The next request will see the refreshed token.
 */
@Injectable()
export class TokenRefreshManager {
  private readonly logger = new Logger(TokenRefreshManager.name);

  constructor(
    private readonly repository: WorkspaceConnectorRepository,
    private readonly adapterFactory: WorkspaceAdapterFactory,
    private readonly tokenManager: OAuthTokenManager,
    private readonly providerAppConfigs: ProviderAppConfigService,
  ) {}

  async getValidAccessToken(connector: WorkspaceConnector): Promise<string | null> {
    if (!connector.encryptedTokens) {
      return null;
    }

    const tokens = this.tokenManager.decryptTokenSet(connector.encryptedTokens);

    if (!this.tokenManager.isTokenExpired(tokens.expiresAt)) {
      return tokens.accessToken;
    }

    if (!tokens.refreshToken) {
      await this.repository.update(connector.id, {
        status: WorkspaceConnectorStatus.DISCONNECTED,
        statusReason: 'access_token_expired_no_refresh_token',
      });
      throw new Error(
        `Token expired for ${connector.provider} connector ${connector.id} — re-authorization required`,
      );
    }

    const lockAcquired = await this.tokenManager.acquireRefreshLock(connector.id);
    if (!lockAcquired) {
      // Another process is already refreshing; return the current (slightly stale)
      // token so this request isn't blocked. The refreshed token will be used next call.
      this.logger.debug(`Refresh lock busy for ${connector.id}; using existing token`);
      return tokens.accessToken;
    }

    try {
      const adapter = this.adapterFactory.getAdapter(connector.provider);
      const appCredentials = await this.resolveCredentials(connector);

      const newTokens = await adapter.refreshTokens(tokens.refreshToken, appCredentials);

      const merged = this.tokenManager.encryptTokenSet({
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken ?? tokens.refreshToken,
        expiresAt: newTokens.expiresAt,
        scopes: newTokens.scopes.length > 0 ? newTokens.scopes : tokens.scopes,
      });

      await this.repository.update(connector.id, {
        encryptedTokens: merged,
        expiresAt: newTokens.expiresAt ?? null,
        lastAuthAt: new Date(),
        status: WorkspaceConnectorStatus.CONNECTED,
        statusReason: null,
      });

      this.tokenManager.logTokenRefresh(connector.id, connector.provider);
      return newTokens.accessToken;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token refresh failed';
      this.logger.warn(`Token refresh failed for connector ${connector.id}: ${message}`);

      await this.repository.update(connector.id, {
        status: WorkspaceConnectorStatus.DISCONNECTED,
        statusReason: message.slice(0, 500),
      });

      throw new Error(`workspace.token_refresh_failed: ${message}`);
    } finally {
      await this.tokenManager.releaseRefreshLock(connector.id);
    }
  }

  private async resolveCredentials(connector: WorkspaceConnector): Promise<AdapterAppCredentials> {
    if (!connector.providerAppConfigId) {
      return {};
    }
    const appConfig = await this.providerAppConfigs.getById(connector.providerAppConfigId);
    const publicConfig = appConfig.publicConfig as Record<string, unknown>;
    const secrets =
      (await this.providerAppConfigs.getDecryptedSecret(connector.providerAppConfigId)) ?? {};

    const readString = (src: Record<string, unknown>, key: string): string | undefined => {
      const v = src[key];
      return typeof v === 'string' && v.length > 0 ? v : undefined;
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
}
