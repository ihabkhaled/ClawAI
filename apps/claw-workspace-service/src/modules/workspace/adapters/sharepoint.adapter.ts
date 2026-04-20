import { Injectable, Logger } from '@nestjs/common';

import {
  HEALTH_CHECK_TIMEOUT_MS,
  MICROSOFT_AUTH_URL,
  MICROSOFT_GRAPH_API_BASE,
  MICROSOFT_SHAREPOINT_SYNC_LIMIT,
  MICROSOFT_TOKEN_URL,
} from '../../../common/constants/workspace.constants';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import type { AdapterAppCredentials, WorkspaceAdapter } from './workspace-adapter.interface';
import type {
  GraphSite,
  GraphSiteList,
  MicrosoftTokenResponse,
} from '../types/microsoft-graph.types';
import type {
  AdapterCapabilities,
  HealthCheckResult,
  LiveObjectDetails,
  OAuthTokenSet,
  SyncedObject,
  SyncResult,
} from '../types/workspace.types';

@Injectable()
export class SharePointAdapter implements WorkspaceAdapter {
  private readonly logger = new Logger(SharePointAdapter.name);

  async healthCheck(accessToken: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${MICROSOFT_GRAPH_API_BASE}/me`, {
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
      this.logger.warn(`SharePoint health check failed: ${message}`);
      return {
        status: WorkspaceConnectorStatus.DISCONNECTED,
        latencyMs: Date.now() - start,
        errorMessage: message,
      };
    }
  }

  async syncObjects(accessToken: string, _deltaToken?: string): Promise<SyncResult> {
    const sites = await this.searchSites(accessToken);
    const objects: SyncedObject[] = sites.map((site) => this.mapSiteToSynced(site));
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
    codeVerifier: string | undefined,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('SharePoint OAuth requires clientId and clientSecret');
    }
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      code,
      redirect_uri: redirectUri,
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    });
    const response = await fetch(MICROSOFT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(`SharePoint token exchange failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as MicrosoftTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  async refreshTokens(
    refreshToken: string,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('SharePoint refresh requires clientId and clientSecret');
    }
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      refresh_token: refreshToken,
    });
    const response = await fetch(MICROSOFT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(`SharePoint token refresh failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as MicrosoftTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  getCapabilities(): AdapterCapabilities {
    return {
      supportsOAuth: true,
      supportsPat: false,
      supportsDeltaSync: false,
      supportsWebhooks: true,
      objectTypes: ['DOCUMENT'],
    };
  }

  getAuthorizationBaseUrl(): string {
    return MICROSOFT_AUTH_URL;
  }

  getDefaultScopes(): string[] {
    return ['Sites.Read.All', 'Files.Read.All', 'offline_access', 'User.Read'];
  }

  async fetchObjectDetails(
    accessToken: string,
    externalId: string,
    objectType: string,
  ): Promise<LiveObjectDetails | null> {
    if (objectType !== WorkspaceObjectType.DOCUMENT) {
      return null;
    }
    const response = await fetch(`${MICROSOFT_GRAPH_API_BASE}/sites/${externalId}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`SharePoint fetchObjectDetails failed: HTTP ${response.status}`);
    }
    const site = (await response.json()) as GraphSite;
    return this.mapSiteToLive(site);
  }

  private normalizeTokenResponse(data: MicrosoftTokenResponse): OAuthTokenSet {
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

  private async searchSites(accessToken: string): Promise<GraphSite[]> {
    const response = await fetch(
      `${MICROSOFT_GRAPH_API_BASE}/sites?search=*&$top=${String(MICROSOFT_SHAREPOINT_SYNC_LIMIT)}`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
    );
    if (!response.ok) {
      throw new Error(`SharePoint list failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as GraphSiteList;
    return data.value;
  }

  private mapSiteToSynced(site: GraphSite): SyncedObject {
    return {
      externalId: site.id,
      type: WorkspaceObjectType.DOCUMENT,
      title: site.displayName ?? site.name,
      content: site.description,
      url: site.webUrl,
      metadata: { siteKind: 'sharepoint' },
      externalCreatedAt: new Date(site.createdDateTime),
      externalUpdatedAt: new Date(site.lastModifiedDateTime),
    };
  }

  private mapSiteToLive(site: GraphSite): LiveObjectDetails {
    return {
      externalId: site.id,
      title: site.displayName ?? site.name,
      content: site.description ?? null,
      url: site.webUrl,
      authorId: null,
      externalCreatedAt: new Date(site.createdDateTime),
      externalUpdatedAt: new Date(site.lastModifiedDateTime),
      metadata: { siteKind: 'sharepoint' },
    };
  }
}
