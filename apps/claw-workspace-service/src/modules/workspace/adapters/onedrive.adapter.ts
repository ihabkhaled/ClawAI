import { Injectable, Logger } from '@nestjs/common';

import {
  HEALTH_CHECK_TIMEOUT_MS,
  MICROSOFT_AUTH_URL,
  MICROSOFT_GRAPH_API_BASE,
  MICROSOFT_GRAPH_SIMPLE_UPLOAD_MAX_BYTES,
  MICROSOFT_ONEDRIVE_SYNC_LIMIT,
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
  GraphDriveItem,
  GraphDriveItemList,
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
export class OneDriveAdapter implements WorkspaceAdapter {
  private readonly logger = new Logger(OneDriveAdapter.name);

  async healthCheck(accessToken: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${MICROSOFT_GRAPH_API_BASE}/me/drive`, {
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
      this.logger.warn(`OneDrive health check failed: ${message}`);
      return {
        status: WorkspaceConnectorStatus.DISCONNECTED,
        latencyMs: Date.now() - start,
        errorMessage: message,
      };
    }
  }

  async syncObjects(accessToken: string, _deltaToken?: string): Promise<SyncResult> {
    const items = await this.listRecentItems(accessToken);
    const objects: SyncedObject[] = items
      .filter((item) => item.file !== undefined)
      .map((item) => this.mapItemToSynced(item));
    return {
      objectsFound: items.length,
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
      throw new Error('OneDrive OAuth requires clientId and clientSecret');
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
      throw new Error(await buildOAuthErrorMessage('OneDrive', 'token exchange', response));
    }
    const data = (await response.json()) as MicrosoftTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  async refreshTokens(
    refreshToken: string,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('OneDrive refresh requires clientId and clientSecret');
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
      throw new Error(await buildOAuthErrorMessage('OneDrive', 'token refresh', response));
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
      supportsDeltaSync: true,
      supportsWebhooks: true,
      objectTypes: ['FILE'],
    };
  }

  getAuthorizationBaseUrl(): string {
    return MICROSOFT_AUTH_URL;
  }

  getDefaultScopes(): string[] {
    return ['Files.Read', 'Files.Read.All', 'offline_access', 'User.Read'];
  }

  async fetchObjectDetails(
    accessToken: string,
    externalId: string,
    objectType: string,
  ): Promise<LiveObjectDetails | null> {
    if (objectType !== WorkspaceObjectType.FILE) {
      return null;
    }
    const response = await fetch(`${MICROSOFT_GRAPH_API_BASE}/me/drive/items/${externalId}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`OneDrive fetchObjectDetails failed: HTTP ${response.status}`);
    }
    const item = (await response.json()) as GraphDriveItem;
    return this.mapItemToLive(item);
  }

  // v3 round 11 (Prompt 08) — stream a OneDrive file's raw bytes via the
  // Graph /content endpoint (which 302-redirects to a pre-authed CDN URL;
  // fetch follows the redirect automatically).
  async downloadFileContent(
    accessToken: string,
    externalId: string,
    metadata?: Record<string, unknown>,
  ): Promise<FileContentStream | null> {
    const name = typeof metadata?.['name'] === 'string' ? metadata['name'] : externalId;
    const response = await fetch(
      `${MICROSOFT_GRAPH_API_BASE}/me/drive/items/${encodeURIComponent(externalId)}/content`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (response.status === 404) return null;
    if (!response.ok || response.body === null) {
      throw new Error(`OneDrive downloadFileContent failed: HTTP ${String(response.status)}`);
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

  private async listRecentItems(accessToken: string): Promise<GraphDriveItem[]> {
    const response = await fetch(
      `${MICROSOFT_GRAPH_API_BASE}/me/drive/recent?$top=${String(MICROSOFT_ONEDRIVE_SYNC_LIMIT)}`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
    );
    if (!response.ok) {
      throw new Error(`OneDrive list failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as GraphDriveItemList;
    return data.value;
  }

  private mapItemToSynced(item: GraphDriveItem): SyncedObject {
    return {
      externalId: item.id,
      type: WorkspaceObjectType.FILE,
      title: item.name,
      content: undefined,
      url: item.webUrl,
      authorId: item.createdBy?.user?.id ?? item.createdBy?.user?.displayName,
      metadata: {
        mimeType: item.file?.mimeType,
        size: item.size,
        driveId: item.parentReference?.driveId,
        path: item.parentReference?.path,
      },
      externalCreatedAt: new Date(item.createdDateTime),
      externalUpdatedAt: new Date(item.lastModifiedDateTime),
    };
  }

  private mapItemToLive(item: GraphDriveItem): LiveObjectDetails {
    return {
      externalId: item.id,
      title: item.name,
      content: null,
      url: item.webUrl,
      authorId: item.createdBy?.user?.id ?? item.createdBy?.user?.displayName ?? null,
      externalCreatedAt: new Date(item.createdDateTime),
      externalUpdatedAt: new Date(item.lastModifiedDateTime),
      metadata: {
        mimeType: item.file?.mimeType,
        size: item.size,
        driveId: item.parentReference?.driveId,
        path: item.parentReference?.path,
      },
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
        case WorkspaceActionType.UPLOAD_ONEDRIVE:
          return await this.uploadFile(accessToken, payload);
        case WorkspaceActionType.MOVE_ONEDRIVE:
          return await this.moveFile(accessToken, payload);
        default:
          return {
            success: false,
            errorMessage: `Action ${actionType} not supported by OneDrive adapter`,
          };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`OneDrive write ${actionType} failed: ${message}`);
      return { success: false, errorMessage: message };
    }
  }

  private async uploadFile(
    token: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
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
    const url = `${MICROSOFT_GRAPH_API_BASE}/drives/${encodeURIComponent(driveId)}/root:${fullPath}:/content`;
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

  private async moveFile(
    token: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    const driveId = String(payload['driveId'] ?? '');
    const itemId = String(payload['itemId'] ?? '');
    const targetParentFolderPath = String(payload['targetParentFolderPath'] ?? '');
    const lookupUrl = `${MICROSOFT_GRAPH_API_BASE}/drives/${encodeURIComponent(driveId)}/root:${encodeGraphPath(targetParentFolderPath)}`;
    const lookupResponse = await fetch(lookupUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!lookupResponse.ok) {
      const text = await lookupResponse.text().catch(() => '');
      return {
        success: false,
        errorMessage: `OneDrive target folder lookup ${String(lookupResponse.status)}: ${text.slice(0, 200)}`,
      };
    }
    const lookupJson = (await lookupResponse.json()) as { id?: string };
    const targetParentId = lookupJson.id;
    if (targetParentId === undefined) {
      return { success: false, errorMessage: 'OneDrive target folder missing id' };
    }
    const url = `${MICROSOFT_GRAPH_API_BASE}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ parentReference: { id: targetParentId } }),
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
