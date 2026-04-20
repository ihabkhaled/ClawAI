import { Injectable, Logger } from '@nestjs/common';

import {
  CONFLUENCE_API_RESOURCES,
  CONFLUENCE_AUTH_URL,
  CONFLUENCE_SYNC_PAGE_LIMIT,
  CONFLUENCE_TOKEN_URL,
  HEALTH_CHECK_TIMEOUT_MS,
} from '../../../common/constants/workspace.constants';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import type { AdapterAppCredentials, WorkspaceAdapter } from './workspace-adapter.interface';
import type {
  AtlassianTokenResponse,
  ConfluencePage,
  ConfluenceResource,
  ConfluenceSearchResponse,
} from '../types/confluence-api.types';
import type {
  AdapterCapabilities,
  HealthCheckResult,
  LiveObjectDetails,
  OAuthTokenSet,
  SyncedObject,
  SyncResult,
} from '../types/workspace.types';

@Injectable()
export class ConfluenceAdapter implements WorkspaceAdapter {
  private readonly logger = new Logger(ConfluenceAdapter.name);

  async healthCheck(accessToken: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(CONFLUENCE_API_RESOURCES, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      });
      const latencyMs = Date.now() - start;
      if (response.ok) {
        return { status: WorkspaceConnectorStatus.CONNECTED, latencyMs };
      }
      if (response.status === 401) {
        return {
          status: WorkspaceConnectorStatus.DISCONNECTED,
          latencyMs,
          errorMessage: 'Unauthorized',
        };
      }
      return {
        status: WorkspaceConnectorStatus.DEGRADED,
        latencyMs,
        errorMessage: `HTTP ${response.status}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Confluence health check failed: ${message}`);
      return {
        status: WorkspaceConnectorStatus.DISCONNECTED,
        latencyMs: Date.now() - start,
        errorMessage: message,
      };
    }
  }

  async syncObjects(accessToken: string, _deltaToken?: string): Promise<SyncResult> {
    const resource = await this.pickConfluenceResource(accessToken);
    if (resource === null) {
      return {
        objectsFound: 0,
        objectsSynced: 0,
        objectsFailed: 0,
        deltaTokenOut: new Date().toISOString(),
        objects: [],
      };
    }
    const pages = await this.fetchPages(accessToken, resource.id);
    const objects: SyncedObject[] = pages.map((p) => this.mapPageToSynced(p, resource));
    return {
      objectsFound: objects.length,
      objectsSynced: objects.length,
      objectsFailed: 0,
      deltaTokenOut: new Date().toISOString(),
      objects,
    };
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    _codeVerifier: string | undefined,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Confluence OAuth requires clientId and clientSecret');
    }
    const response = await fetch(CONFLUENCE_TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: appCredentials.clientId,
        client_secret: appCredentials.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!response.ok) {
      throw new Error(`Confluence token exchange failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as AtlassianTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  async refreshTokens(
    refreshToken: string,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Confluence refresh requires clientId and clientSecret');
    }
    const response = await fetch(CONFLUENCE_TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: appCredentials.clientId,
        client_secret: appCredentials.clientSecret,
        refresh_token: refreshToken,
      }),
    });
    if (!response.ok) {
      throw new Error(`Confluence token refresh failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as AtlassianTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  getCapabilities(): AdapterCapabilities {
    return {
      supportsOAuth: true,
      supportsPat: false,
      supportsDeltaSync: false,
      supportsWebhooks: false,
      objectTypes: ['DOCUMENT'],
    };
  }

  getAuthorizationBaseUrl(): string {
    return CONFLUENCE_AUTH_URL;
  }

  getDefaultScopes(): string[] {
    return [
      'read:content:confluence',
      'read:content-details:confluence',
      'read:space:confluence',
      'offline_access',
    ];
  }

  async fetchObjectDetails(
    accessToken: string,
    externalId: string,
    objectType: string,
    metadata?: Record<string, unknown>,
  ): Promise<LiveObjectDetails | null> {
    if (objectType !== WorkspaceObjectType.DOCUMENT) {
      return null;
    }
    const cloudId =
      typeof metadata?.['cloudId'] === 'string' ? (metadata['cloudId'] as string) : null;
    if (cloudId === null) {
      this.logger.warn(`Confluence refresh skipped for ${externalId}: missing cloudId metadata`);
      return null;
    }
    const response = await fetch(
      `https://api.atlassian.com/ex/confluence/${cloudId}/wiki/rest/api/content/${externalId}?expand=body.storage,history,version,space`,
      {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      },
    );
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Confluence fetchObjectDetails failed: HTTP ${response.status}`);
    }
    const page = (await response.json()) as ConfluencePage;
    const baseUrl =
      typeof metadata?.['baseUrl'] === 'string' ? (metadata['baseUrl'] as string) : '';
    return this.pageToLive(page, baseUrl, cloudId);
  }

  private normalizeTokenResponse(data: AtlassianTokenResponse): OAuthTokenSet {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt:
        data.expires_in !== undefined && data.expires_in !== null
          ? new Date(Date.now() + data.expires_in * 1000)
          : undefined,
      scopes: data.scope !== undefined ? data.scope.split(' ').filter(Boolean) : [],
    };
  }

  private async pickConfluenceResource(accessToken: string): Promise<ConfluenceResource | null> {
    const response = await fetch(CONFLUENCE_API_RESOURCES, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Confluence resources failed: HTTP ${response.status}`);
    }
    const list = (await response.json()) as ConfluenceResource[];
    return list.find((r) => r.scopes.some((s) => s.includes('confluence'))) ?? list[0] ?? null;
  }

  private async fetchPages(accessToken: string, cloudId: string): Promise<ConfluencePage[]> {
    const response = await fetch(
      `https://api.atlassian.com/ex/confluence/${cloudId}/wiki/rest/api/content?limit=${String(CONFLUENCE_SYNC_PAGE_LIMIT)}&expand=history,version,space`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
    );
    if (!response.ok) {
      throw new Error(`Confluence pages fetch failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as ConfluenceSearchResponse;
    return data.results;
  }

  private mapPageToSynced(page: ConfluencePage, resource: ConfluenceResource): SyncedObject {
    const webui = page._links.webui ?? '';
    const url = webui.length > 0 ? `${resource.url}/wiki${webui}` : resource.url;
    return {
      externalId: page.id,
      type: WorkspaceObjectType.DOCUMENT,
      title: page.title,
      content: page.body?.storage?.value?.slice(0, 10_000),
      url,
      authorId: page.history?.createdBy?.accountId ?? page.history?.createdBy?.displayName,
      metadata: {
        cloudId: resource.id,
        baseUrl: resource.url,
        spaceKey: page.space?.key,
        version: page.version?.number,
        pageType: page.type,
        status: page.status,
      },
      externalCreatedAt: page.history?.createdDate ? new Date(page.history.createdDate) : undefined,
      externalUpdatedAt: page.version?.when ? new Date(page.version.when) : undefined,
    };
  }

  private pageToLive(page: ConfluencePage, baseUrl: string, cloudId: string): LiveObjectDetails {
    const webui = page._links.webui ?? '';
    const url = webui.length > 0 && baseUrl.length > 0 ? `${baseUrl}/wiki${webui}` : null;
    return {
      externalId: page.id,
      title: page.title,
      content: page.body?.storage?.value?.slice(0, 10_000) ?? null,
      url,
      authorId: page.history?.createdBy?.accountId ?? page.history?.createdBy?.displayName ?? null,
      externalCreatedAt: page.history?.createdDate ? new Date(page.history.createdDate) : null,
      externalUpdatedAt: page.version?.when ? new Date(page.version.when) : null,
      metadata: {
        cloudId,
        baseUrl,
        spaceKey: page.space?.key,
        version: page.version?.number,
        status: page.status,
      },
    };
  }
}
