import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import {
  GOOGLE_AUTH_URL,
  GOOGLE_DRIVE_API_BASE,
  GOOGLE_TOKEN_URL,
  HEALTH_CHECK_TIMEOUT_MS,
} from '../../../common/constants/workspace.constants';
import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import type { AdapterAppCredentials, WorkspaceAdapter } from './workspace-adapter.interface';
import type {
  AdapterCapabilities,
  HealthCheckResult,
  OAuthTokenSet,
  SyncedObject,
  SyncResult,
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
      throw new Error(`Google Drive sync failed: HTTP ${response.status}`);
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
    const data = (await response.json()) as { access_token: string; expires_in?: number };
    const expiresAt = data['expires_in']
      ? new Date(Date.now() + data['expires_in'] * 1000)
      : undefined;
    return { accessToken: data['access_token'], refreshToken, expiresAt, scopes: [] };
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
    return ['https://www.googleapis.com/auth/drive.readonly'];
  }

  supportsWrite(): boolean {
    return false;
  }
}
