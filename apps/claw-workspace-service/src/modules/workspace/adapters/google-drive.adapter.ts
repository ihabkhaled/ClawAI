import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceActionType } from '../../../common/enums/workspace-action-type.enum';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import {
  GOOGLE_AUTH_URL,
  GOOGLE_DRIVE_API_BASE,
  GOOGLE_TOKEN_URL,
  HEALTH_CHECK_TIMEOUT_MS,
  OAUTH_PROBE_INVALID_CODE,
  OAUTH_PROBE_INVALID_REDIRECT_URI,
} from '../../../common/constants/workspace.constants';
import { OAuthProbeOutcome } from '../enums/oauth-probe-outcome.enum';
import { probeOAuthAppCredentials } from '../utilities/oauth-app-probe.utility';
import { buildOAuthErrorMessage } from '../utilities/oauth-error.utility';
import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import type { AdapterAppCredentials, WorkspaceAdapter } from './workspace-adapter.interface';
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
export class GoogleDriveAdapter implements WorkspaceAdapter {
  private readonly logger = new Logger(GoogleDriveAdapter.name);

  async healthCheck(accessToken: string, _baseUrl?: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/about?fields=user`, {
        headers: { Authorization: `Bearer ${accessToken}` },
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
      const body = await response.text().catch(() => '');
      this.logger.warn(`Google Drive health check HTTP ${response.status}: ${body.slice(0, 500)}`);
      return {
        status: WorkspaceConnectorStatus.DEGRADED,
        latencyMs,
        errorMessage: `HTTP ${response.status}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Google Drive health check failed: ${message}`);
      return {
        status: WorkspaceConnectorStatus.DISCONNECTED,
        latencyMs: Date.now() - start,
        errorMessage: message,
      };
    }
  }

  async syncObjects(accessToken: string, deltaToken?: string): Promise<SyncResult> {
    const params = new URLSearchParams({
      pageSize: '100',
      fields: 'files(id,name,mimeType,webViewLink,owners,createdTime,modifiedTime)',
      ...(deltaToken ? { pageToken: deltaToken } : {}),
    });
    const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(`Google Drive sync HTTP ${response.status}: ${body.slice(0, 500)}`);
      throw new Error(`Google Drive sync failed: HTTP ${response.status} — ${body.slice(0, 200)}`);
    }
    const data = (await response.json()) as {
      files: Array<{
        id: string;
        name: string;
        mimeType: string;
        webViewLink?: string;
        owners?: Array<{ emailAddress: string }>;
        createdTime?: string;
        modifiedTime?: string;
      }>;
      nextPageToken?: string;
    };
    const objects: SyncedObject[] = data.files.map((file) => ({
      externalId: file.id,
      type: this.resolveObjectType(file.mimeType),
      title: file.name,
      url: file.webViewLink,
      authorId: file.owners?.[0]?.emailAddress,
      metadata: { mimeType: file.mimeType } as Record<string, unknown>,
      externalCreatedAt: file.createdTime ? new Date(file.createdTime) : undefined,
      externalUpdatedAt: file.modifiedTime ? new Date(file.modifiedTime) : undefined,
    }));
    return {
      objectsFound: objects.length,
      objectsSynced: objects.length,
      objectsFailed: 0,
      deltaTokenOut: data['nextPageToken'],
      objects,
    };
  }

  private resolveObjectType(mimeType: string): WorkspaceObjectType {
    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      return WorkspaceObjectType.SPREADSHEET;
    }
    if (mimeType === 'application/vnd.google-apps.folder') {
      return WorkspaceObjectType.PROJECT;
    }
    return WorkspaceObjectType.DOCUMENT;
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    codeVerifier: string | undefined,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error(
        'Google Drive OAuth requires clientId and clientSecret from provider app config',
      );
    }
    const body: Record<string, string> = {
      code,
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    };
    if (codeVerifier !== undefined) {
      body['code_verifier'] = codeVerifier;
    }
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
    });
    if (!response.ok) {
      throw new Error(await buildOAuthErrorMessage('Google Drive', 'token exchange', response));
    }
    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    const expiresAt = data['expires_in']
      ? new Date(Date.now() + data['expires_in'] * 1000)
      : undefined;
    return {
      accessToken: data['access_token'],
      refreshToken: data['refresh_token'],
      expiresAt,
      scopes: (data['scope'] ?? '').split(' ').filter(Boolean),
    };
  }

  async refreshTokens(
    refreshToken: string,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error(
        'Google Drive OAuth refresh requires clientId and clientSecret from provider app config',
      );
    }
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      refresh_token: refreshToken,
    });
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(await buildOAuthErrorMessage('Google Drive', 'token refresh', response));
    }
    const data = (await response.json()) as { access_token: string; expires_in?: number };
    const expiresAt = data['expires_in']
      ? new Date(Date.now() + data['expires_in'] * 1000)
      : undefined;
    return { accessToken: data['access_token'], refreshToken, expiresAt, scopes: [] };
  }

  async validateOAuthAppConfig(appCredentials: AdapterAppCredentials): Promise<HealthCheckResult> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Google OAuth probe requires clientId and clientSecret');
    }
    const form = new URLSearchParams({
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      grant_type: 'authorization_code',
      code: OAUTH_PROBE_INVALID_CODE,
      redirect_uri: OAUTH_PROBE_INVALID_REDIRECT_URI,
    });
    return probeOAuthAppCredentials({
      tokenUrl: GOOGLE_TOKEN_URL,
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
        if (error === 'invalid_grant' || error === 'redirect_uri_mismatch') {
          return OAuthProbeOutcome.CREDENTIALS_OK;
        }
        if (error === 'invalid_client' || status === 401) {
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
      supportsWebhooks: false,
      objectTypes: ['FILE', 'DOCUMENT'],
    };
  }

  getAuthorizationBaseUrl(): string {
    return GOOGLE_AUTH_URL;
  }

  getDefaultScopes(): string[] {
    return [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file',
    ];
  }

  getExtraAuthParams(): Record<string, string> {
    return { access_type: 'offline', prompt: 'consent' };
  }

  async fetchObjectDetails(
    accessToken: string,
    externalId: string,
    _objectType: string,
  ): Promise<LiveObjectDetails | null> {
    const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };
    const metaResponse = await fetch(
      `${GOOGLE_DRIVE_API_BASE}/files/${externalId}?fields=id,name,mimeType,webViewLink,webContentLink,owners,createdTime,modifiedTime,size,description`,
      { headers, signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS) },
    );
    if (metaResponse.status === 404) return null;
    if (!metaResponse.ok) {
      throw new Error(`Google Drive fetchObjectDetails failed: HTTP ${metaResponse.status}`);
    }
    const file = (await metaResponse.json()) as {
      id: string;
      name: string;
      mimeType: string;
      webViewLink?: string;
      webContentLink?: string;
      owners?: Array<{ emailAddress: string }>;
      createdTime?: string;
      modifiedTime?: string;
      size?: string;
      description?: string;
    };

    const content = await this.fetchFileContent(accessToken, file.id, file.mimeType);
    return {
      externalId: file.id,
      title: file.name,
      content,
      url: file.webViewLink ?? null,
      authorId: file.owners?.[0]?.emailAddress ?? null,
      externalCreatedAt: file.createdTime ? new Date(file.createdTime) : null,
      externalUpdatedAt: file.modifiedTime ? new Date(file.modifiedTime) : null,
      metadata: {
        mimeType: file.mimeType,
        webContentLink: file.webContentLink,
        size: file.size,
        description: file.description,
      },
    };
  }

  private async fetchFileContent(
    accessToken: string,
    fileId: string,
    mimeType: string,
  ): Promise<string | null> {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const signal = AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS);
    try {
      if (mimeType === 'application/vnd.google-apps.document') {
        const response = await fetch(
          `${GOOGLE_DRIVE_API_BASE}/files/${fileId}/export?mimeType=text/plain`,
          { headers, signal },
        );
        if (!response.ok) return null;
        return (await response.text()).slice(0, 50_000);
      }
      if (mimeType === 'application/vnd.google-apps.spreadsheet') {
        const response = await fetch(
          `${GOOGLE_DRIVE_API_BASE}/files/${fileId}/export?mimeType=text/csv`,
          { headers, signal },
        );
        if (!response.ok) return null;
        return (await response.text()).slice(0, 50_000);
      }
      if (mimeType === 'text/plain') {
        const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}?alt=media`, {
          headers,
          signal,
        });
        if (!response.ok) return null;
        return (await response.text()).slice(0, 50_000);
      }
      return null;
    } catch {
      return null;
    }
  }

  // v3 round 11 (Prompt 08) — stream a Drive file's raw bytes. Google
  // Docs/Sheets/Slides are exported to a portable format (PDF / CSV);
  // binary files are streamed as-is via ?alt=media.
  async downloadFileContent(
    accessToken: string,
    externalId: string,
    metadata?: Record<string, unknown>,
  ): Promise<FileContentStream | null> {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const mimeType = typeof metadata?.['mimeType'] === 'string' ? metadata['mimeType'] : '';
    const name = typeof metadata?.['name'] === 'string' ? metadata['name'] : externalId;

    // Google-native docs cannot be downloaded directly — export them.
    const exportMap: Record<string, { mime: string; ext: string }> = {
      'application/vnd.google-apps.document': {
        mime: 'application/pdf',
        ext: '.pdf',
      },
      'application/vnd.google-apps.spreadsheet': { mime: 'text/csv', ext: '.csv' },
      'application/vnd.google-apps.presentation': {
        mime: 'application/pdf',
        ext: '.pdf',
      },
    };
    const exportTarget = exportMap[mimeType];
    const url =
      exportTarget !== undefined
        ? `${GOOGLE_DRIVE_API_BASE}/files/${encodeURIComponent(externalId)}/export?mimeType=${encodeURIComponent(exportTarget.mime)}`
        : `${GOOGLE_DRIVE_API_BASE}/files/${encodeURIComponent(externalId)}?alt=media`;

    const response = await fetch(url, { headers });
    if (response.status === 404) return null;
    if (!response.ok || response.body === null) {
      throw new Error(`Google Drive downloadFileContent failed: HTTP ${String(response.status)}`);
    }
    const contentLength = response.headers.get('content-length');
    return {
      filename: exportTarget !== undefined ? `${name}${exportTarget.ext}` : name,
      mimeType:
        exportTarget?.mime ?? response.headers.get('content-type') ?? 'application/octet-stream',
      sizeBytes: contentLength !== null ? Number(contentLength) : null,
      body: response.body,
    };
  }

  supportsWrite(): boolean {
    return true;
  }

  getSupportedActionTypes(): WorkspaceActionType[] {
    return [WorkspaceActionType.UPLOAD_DRIVE, WorkspaceActionType.MOVE_DRIVE];
  }

  async executeWriteAction(
    accessToken: string,
    actionType: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    if (actionType === 'UPLOAD_DRIVE') {
      const name = typeof payload['name'] === 'string' ? payload['name'] : null;
      const content = typeof payload['content'] === 'string' ? payload['content'] : null;
      const parentId = typeof payload['parentId'] === 'string' ? payload['parentId'] : undefined;
      const mimeType = typeof payload['mimeType'] === 'string' ? payload['mimeType'] : 'text/plain';
      if (name === null || content === null) {
        return {
          success: false,
          errorMessage: 'UPLOAD_DRIVE requires {name, content} in payload',
        };
      }
      const boundary = `claw-upload-${Date.now().toString(16)}`;
      const metadata: Record<string, unknown> = { name, mimeType };
      if (parentId !== undefined) {
        metadata['parents'] = [parentId];
      }
      const multipart = [
        `--${boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify(metadata),
        `--${boundary}`,
        `Content-Type: ${mimeType}`,
        '',
        content,
        `--${boundary}--`,
      ].join('\r\n');
      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipart,
        },
      );
      if (!response.ok) {
        return { success: false, errorMessage: `Drive upload failed: HTTP ${response.status}` };
      }
      const data = (await response.json()) as { id: string; webViewLink?: string };
      return {
        success: true,
        externalId: data.id,
        url: data.webViewLink,
      };
    }

    if (actionType === 'MOVE_DRIVE') {
      const fileId = payload['fileId'] as string;
      const addParents = payload['addParents'] as string | undefined;
      const removeParents = payload['removeParents'] as string | undefined;
      const qs = new URLSearchParams();
      if (addParents !== undefined) {
        qs.set('addParents', addParents);
      }
      if (removeParents !== undefined) {
        qs.set('removeParents', removeParents);
      }
      const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}?${qs.toString()}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        return { success: false, errorMessage: `Drive move failed: HTTP ${response.status}` };
      }
      const data = (await response.json()) as { id: string; webViewLink?: string };
      return { success: true, externalId: data.id, url: data.webViewLink };
    }

    return {
      success: false,
      errorMessage: `Google Drive adapter: unsupported action type ${actionType}`,
    };
  }
}
