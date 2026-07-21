import { Injectable, Logger } from '@nestjs/common';

import {
  CONFLUENCE_API_RESOURCES,
  CONFLUENCE_AUTH_URL,
  CONFLUENCE_SYNC_PAGE_LIMIT,
  CONFLUENCE_TOKEN_URL,
  HEALTH_CHECK_TIMEOUT_MS,
  OAUTH_PROBE_INVALID_CODE,
  OAUTH_PROBE_INVALID_REDIRECT_URL,
} from '../../../common/constants/workspace.constants';
import { OAuthProbeOutcome } from '../enums/oauth-probe-outcome.enum';
import { probeOAuthAppCredentials } from '../utilities/oauth-app-probe.utility';
import { buildOAuthErrorMessage } from '../utilities/oauth-error.utility';
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
  WriteActionResult,
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
      throw new Error(await buildOAuthErrorMessage('Confluence', 'token exchange', response));
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
      throw new Error(await buildOAuthErrorMessage('Confluence', 'token refresh', response));
    }
    const data = (await response.json()) as AtlassianTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  async validateOAuthAppConfig(appCredentials: AdapterAppCredentials): Promise<HealthCheckResult> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Confluence OAuth probe requires clientId and clientSecret');
    }
    return probeOAuthAppCredentials({
      tokenUrl: CONFLUENCE_TOKEN_URL,
      requestBuilder: () => ({
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: appCredentials.clientId,
          client_secret: appCredentials.clientSecret,
          code: OAUTH_PROBE_INVALID_CODE,
          redirect_uri: OAUTH_PROBE_INVALID_REDIRECT_URL,
        }),
      }),
      interpret: (payload, status) => {
        const data = payload as { error?: string } | null;
        const error = data?.error;
        if (error === 'invalid_grant' || error === 'invalid_request') {
          return OAuthProbeOutcome.CREDENTIALS_OK;
        }
        if (error === 'invalid_client' || error === 'unauthorized_client' || status === 401) {
          return OAuthProbeOutcome.CREDENTIALS_BAD;
        }
        return OAuthProbeOutcome.UNKNOWN;
      },
    });
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

  supportsWrite(): boolean {
    return true;
  }

  async executeWriteAction(
    accessToken: string,
    actionType: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    const resourcesResponse = await fetch(CONFLUENCE_API_RESOURCES, { headers });
    if (!resourcesResponse.ok) {
      return {
        success: false,
        errorMessage: `Confluence site lookup failed: HTTP ${resourcesResponse.status}`,
      };
    }
    const resources = (await resourcesResponse.json()) as Array<ConfluenceResource>;
    const site = resources[0];
    if (site === undefined) {
      return { success: false, errorMessage: 'No Confluence site accessible with this token' };
    }
    const baseUrl = `https://api.atlassian.com/ex/confluence/${site.id}/wiki/rest/api`;

    if (actionType === 'CREATE_CONFLUENCE') {
      const response = await fetch(`${baseUrl}/content`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'page',
          title: payload['title'],
          space: { key: payload['spaceKey'] },
          body: {
            storage: {
              value: payload['storage'] ?? payload['body'],
              representation: 'storage',
            },
          },
          ...(payload['parentId'] !== undefined
            ? { ancestors: [{ id: payload['parentId'] }] }
            : {}),
        }),
      });
      if (!response.ok) {
        return { success: false, errorMessage: `Confluence API error: HTTP ${response.status}` };
      }
      const page = (await response.json()) as { id: string; _links?: { webui?: string } };
      return {
        success: true,
        externalId: page.id,
        url: page._links?.webui,
      };
    }

    if (actionType === 'EDIT_CONFLUENCE') {
      const pageId = payload['pageId'] as string;
      const expectedVersion = payload['expectedVersion'] as number;
      const response = await fetch(`${baseUrl}/content/${pageId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: pageId,
          type: 'page',
          title: payload['title'],
          version: { number: expectedVersion + 1 },
          body: {
            storage: {
              value: payload['storage'] ?? payload['body'],
              representation: 'storage',
            },
          },
        }),
      });
      if (!response.ok) {
        return { success: false, errorMessage: `Confluence API error: HTTP ${response.status}` };
      }
      const page = (await response.json()) as {
        id: string;
        version?: { number: number };
        _links?: { webui?: string };
      };
      return {
        success: true,
        externalId: page.id,
        url: page._links?.webui,
        metadata: { newVersion: page.version?.number },
      };
    }

    return {
      success: false,
      errorMessage: `Confluence adapter: unsupported action type ${actionType}`,
    };
  }
}
