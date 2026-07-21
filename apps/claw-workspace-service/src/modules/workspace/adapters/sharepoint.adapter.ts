import { Injectable, Logger } from '@nestjs/common';

import {
  HEALTH_CHECK_TIMEOUT_MS,
  MICROSOFT_AUTH_URL,
  MICROSOFT_GRAPH_API_BASE,
  MICROSOFT_GRAPH_SIMPLE_UPLOAD_MAX_BYTES,
  MICROSOFT_SHAREPOINT_SYNC_LIMIT,
  MICROSOFT_TOKEN_URL,
  OAUTH_PROBE_INVALID_CODE,
  OAUTH_PROBE_INVALID_REDIRECT_URI,
} from '../../../common/constants/workspace.constants';
import { encodeGraphPath } from '../../../common/utilities/microsoft-graph-path.utility';
import { OAuthProbeOutcome } from '../enums/oauth-probe-outcome.enum';
import { probeOAuthAppCredentials } from '../utilities/oauth-app-probe.utility';
import { buildOAuthErrorMessage } from '../utilities/oauth-error.utility';
import { WorkspaceActionType } from '../../../common/enums/workspace-action-type.enum';
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
  FileContentStream,
  HealthCheckResult,
  LiveObjectDetails,
  OAuthTokenSet,
  SyncedObject,
  SyncResult,
  WriteActionResult,
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
      throw new Error(await buildOAuthErrorMessage('SharePoint', 'token exchange', response));
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
      throw new Error(await buildOAuthErrorMessage('SharePoint', 'token refresh', response));
    }
    const data = (await response.json()) as MicrosoftTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  async validateOAuthAppConfig(appCredentials: AdapterAppCredentials): Promise<HealthCheckResult> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Microsoft OAuth probe requires clientId and clientSecret');
    }
    const tokenUrl = appCredentials.tenantId
      ? MICROSOFT_TOKEN_URL.replace('/common/', `/${appCredentials.tenantId}/`)
      : MICROSOFT_TOKEN_URL;
    const form = new URLSearchParams({
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      grant_type: 'authorization_code',
      code: OAUTH_PROBE_INVALID_CODE,
      redirect_uri: OAUTH_PROBE_INVALID_REDIRECT_URI,
    });
    return probeOAuthAppCredentials({
      tokenUrl,
      requestBuilder: () => ({
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: form.toString(),
      }),
      interpret: (payload, status) => {
        const data = payload as { error?: string; error_description?: string } | null;
        const error = data?.error;
        const description = data?.error_description ?? '';
        if (
          error === 'invalid_grant' ||
          /AADSTS70008|AADSTS54005|AADSTS9002313/.test(description)
        ) {
          return OAuthProbeOutcome.CREDENTIALS_OK;
        }
        if (
          error === 'invalid_client' ||
          error === 'unauthorized_client' ||
          /AADSTS7000215|AADSTS700016|AADSTS90002/.test(description) ||
          status === 401
        ) {
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

  // v3 round 11 (Prompt 08) — stream a SharePoint document-library file.
  // SharePoint files live inside a drive on a site, so the caller must
  // supply `driveId` in the object metadata; `externalId` is the
  // driveItem id. Returns null when either is missing or the item 404s.
  async downloadFileContent(
    accessToken: string,
    externalId: string,
    metadata?: Record<string, unknown>,
  ): Promise<FileContentStream | null> {
    const driveId = typeof metadata?.['driveId'] === 'string' ? metadata['driveId'] : '';
    if (driveId.length === 0) {
      // No drive context — can't resolve the file. Caller surfaces this
      // as a 404 rather than guessing.
      return null;
    }
    const name = typeof metadata?.['name'] === 'string' ? metadata['name'] : externalId;
    const response = await fetch(
      `${MICROSOFT_GRAPH_API_BASE}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(externalId)}/content`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (response.status === 404) return null;
    if (!response.ok || response.body === null) {
      throw new Error(`SharePoint downloadFileContent failed: HTTP ${String(response.status)}`);
    }
    const contentLength = response.headers.get('content-length');
    return {
      filename: name,
      mimeType: response.headers.get('content-type') ?? 'application/octet-stream',
      sizeBytes: contentLength !== null ? Number(contentLength) : null,
      body: response.body,
    };
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

  // ─── Stream 21: write actions ───────────────────────────

  supportsWrite(): boolean {
    return true;
  }

  async executeWriteAction(
    accessToken: string,
    actionType: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    try {
      switch (actionType) {
        case WorkspaceActionType.UPLOAD_SHAREPOINT:
          return await this.uploadFile(accessToken, payload);
        case WorkspaceActionType.CREATE_SHAREPOINT_LIST_ITEM:
          return await this.createListItem(accessToken, payload);
        case WorkspaceActionType.UPDATE_SHAREPOINT_LIST_ITEM:
          return await this.updateListItem(accessToken, payload);
        default:
          return {
            success: false,
            errorMessage: `Action ${actionType} not supported by SharePoint adapter`,
          };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`SharePoint write ${actionType} failed: ${message}`);
      return { success: false, errorMessage: message };
    }
  }

  private async uploadFile(
    token: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    const siteId = String(payload['siteId'] ?? '');
    const driveId = String(payload['driveId'] ?? '');
    const parentFolderPath = String(payload['parentFolderPath'] ?? '');
    const fileName = String(payload['fileName'] ?? '');
    const contentBase64 = String(payload['contentBase64'] ?? '');
    const mimeType = String(payload['mimeType'] ?? 'application/octet-stream');
    const buf = Buffer.from(contentBase64, 'base64');
    if (buf.length > MICROSOFT_GRAPH_SIMPLE_UPLOAD_MAX_BYTES) {
      return {
        success: false,
        errorMessage: `FILE_TOO_LARGE_FOR_SIMPLE_UPLOAD (size=${String(buf.length)}, max=${String(MICROSOFT_GRAPH_SIMPLE_UPLOAD_MAX_BYTES)})`,
      };
    }
    const fullPath = encodeGraphPath(`${parentFolderPath}/${fileName}`);
    const url = `${MICROSOFT_GRAPH_API_BASE}/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/root:${fullPath}:/content`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mimeType,
        Accept: 'application/json',
      },
      body: buf,
    });
    return this.toGraphResult(response);
  }

  private async createListItem(
    token: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    const siteId = String(payload['siteId'] ?? '');
    const listId = String(payload['listId'] ?? '');
    const fields = (payload['fields'] as Record<string, unknown> | undefined) ?? {};
    const url = `${MICROSOFT_GRAPH_API_BASE}/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/items`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ fields }),
    });
    return this.toGraphResult(response);
  }

  private async updateListItem(
    token: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    const siteId = String(payload['siteId'] ?? '');
    const listId = String(payload['listId'] ?? '');
    const itemId = String(payload['itemId'] ?? '');
    const fields = (payload['fields'] as Record<string, unknown> | undefined) ?? {};
    const url = `${MICROSOFT_GRAPH_API_BASE}/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}/fields`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(fields),
    });
    return this.toGraphResult(response);
  }

  private async toGraphResult(response: Response): Promise<WriteActionResult> {
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        success: false,
        errorMessage: `Microsoft Graph ${String(response.status)} ${text.slice(0, 200)}`,
      };
    }
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const externalId = typeof json['id'] === 'string' ? (json['id'] as string) : undefined;
    const url = typeof json['webUrl'] === 'string' ? (json['webUrl'] as string) : undefined;
    return { success: true, externalId, url };
  }
}
