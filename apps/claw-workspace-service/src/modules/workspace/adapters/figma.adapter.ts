import { Injectable, Logger } from '@nestjs/common';

import {
  FIGMA_API_BASE,
  FIGMA_AUTH_URL,
  FIGMA_DEFAULT_SCOPES,
  FIGMA_SYNC_PROJECTS_LIMIT,
  FIGMA_TOKEN_URL,
  HEALTH_CHECK_TIMEOUT_MS,
  OAUTH_PROBE_INVALID_CODE,
  OAUTH_PROBE_INVALID_REDIRECT_URI,
} from '../../../common/constants/workspace.constants';
import { OAuthProbeOutcome } from '../enums/oauth-probe-outcome.enum';
import { probeOAuthAppCredentials } from '../utilities/oauth-app-probe.utility';
import { buildOAuthErrorMessage } from '../utilities/oauth-error.utility';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import type { AdapterAppCredentials, WorkspaceAdapter } from './workspace-adapter.interface';
import type {
  FigmaFile,
  FigmaFileDetailsResponse,
  FigmaProjectFilesResponse,
  FigmaProjectsResponse,
  FigmaTeamProject,
  FigmaTokenResponse,
} from '../types/figma-api.types';
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
export class FigmaAdapter implements WorkspaceAdapter {
  private readonly logger = new Logger(FigmaAdapter.name);

  async healthCheck(accessToken: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${FIGMA_API_BASE}/me`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      });
      const latencyMs = Date.now() - start;
      if (response.ok) {
        return { status: WorkspaceConnectorStatus.CONNECTED, latencyMs };
      }
      if (response.status === 401 || response.status === 403) {
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
      this.logger.warn(`Figma health check failed: ${message}`);
      return {
        status: WorkspaceConnectorStatus.DISCONNECTED,
        latencyMs: Date.now() - start,
        errorMessage: message,
      };
    }
  }

  async syncObjects(
    accessToken: string,
    _deltaToken?: string,
    teamId?: string,
  ): Promise<SyncResult> {
    const objects: SyncedObject[] = [];
    let errorMessage: string | undefined;
    if (teamId !== undefined && teamId.length > 0) {
      try {
        const projects = await this.listTeamProjects(accessToken, teamId);
        for (const project of projects.slice(0, FIGMA_SYNC_PROJECTS_LIMIT)) {
          const files = await this.safeFetchProjectFiles(accessToken, project.id);
          objects.push(...files.map((f) => this.mapFileToSynced(f, project)));
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }
    } else {
      errorMessage = 'Figma sync requires a teamId in connector metadata';
    }
    return {
      objectsFound: objects.length,
      objectsSynced: objects.length,
      objectsFailed: 0,
      deltaTokenOut: new Date().toISOString(),
      errorMessage,
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
      throw new Error('Figma OAuth requires clientId and clientSecret');
    }
    const body = new URLSearchParams({
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      redirect_uri: redirectUri,
      code,
      grant_type: 'authorization_code',
    });
    const response = await fetch(FIGMA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(await buildOAuthErrorMessage('Figma', 'token exchange', response));
    }
    const data = (await response.json()) as FigmaTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  async refreshTokens(
    refreshToken: string,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Figma refresh requires clientId and clientSecret');
    }
    const body = new URLSearchParams({
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      refresh_token: refreshToken,
    });
    const response = await fetch(`${FIGMA_API_BASE}/oauth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(await buildOAuthErrorMessage('Figma', 'token refresh', response));
    }
    const data = (await response.json()) as FigmaTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  async validateOAuthAppConfig(appCredentials: AdapterAppCredentials): Promise<HealthCheckResult> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Figma OAuth probe requires clientId and clientSecret');
    }
    const form = new URLSearchParams({
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      grant_type: 'authorization_code',
      code: OAUTH_PROBE_INVALID_CODE,
      redirect_uri: OAUTH_PROBE_INVALID_REDIRECT_URI,
    });
    return probeOAuthAppCredentials({
      tokenUrl: FIGMA_TOKEN_URL,
      requestBuilder: () => ({
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: form.toString(),
      }),
      interpret: (payload, status) => {
        const data = payload as { error?: string; status?: number; message?: string } | null;
        const error = data?.error;
        if (error === 'invalid_grant' || error === 'invalid_request') {
          return OAuthProbeOutcome.CREDENTIALS_OK;
        }
        if (error === 'invalid_client' || status === 401 || status === 403) {
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
      objectTypes: ['FILE'],
    };
  }

  getAuthorizationBaseUrl(): string {
    return FIGMA_AUTH_URL;
  }

  getDefaultScopes(): string[] {
    return FIGMA_DEFAULT_SCOPES;
  }

  async fetchObjectDetails(
    accessToken: string,
    externalId: string,
    objectType: string,
  ): Promise<LiveObjectDetails | null> {
    if (objectType !== WorkspaceObjectType.FILE) {
      return null;
    }
    const response = await fetch(`${FIGMA_API_BASE}/files/${externalId}?depth=1`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Figma fetchObjectDetails failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as FigmaFileDetailsResponse;
    return {
      externalId,
      title: data.name,
      content: null,
      url: `https://www.figma.com/file/${externalId}`,
      authorId: null,
      externalCreatedAt: null,
      externalUpdatedAt: new Date(data.lastModified),
      metadata: {
        version: data.version,
        role: data.role,
        thumbnailUrl: data.thumbnailUrl,
      },
    };
  }

  private normalizeTokenResponse(data: FigmaTokenResponse): OAuthTokenSet {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt:
        data.expires_in !== undefined && data.expires_in !== null
          ? new Date(Date.now() + data.expires_in * 1000)
          : undefined,
      scopes: FIGMA_DEFAULT_SCOPES,
    };
  }

  private async listTeamProjects(accessToken: string, teamId: string): Promise<FigmaTeamProject[]> {
    const response = await fetch(`${FIGMA_API_BASE}/teams/${teamId}/projects`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Figma projects failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as FigmaProjectsResponse;
    return data.projects;
  }

  private async safeFetchProjectFiles(
    accessToken: string,
    projectId: string,
  ): Promise<FigmaFile[]> {
    try {
      const response = await fetch(`${FIGMA_API_BASE}/projects/${projectId}/files`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      });
      if (!response.ok) {
        this.logger.warn(`Figma files fetch failed for ${projectId}: HTTP ${response.status}`);
        return [];
      }
      const data = (await response.json()) as FigmaProjectFilesResponse;
      return data.files;
    } catch (error) {
      this.logger.warn(`Figma files error project=${projectId}: ${String(error)}`);
      return [];
    }
  }

  private mapFileToSynced(file: FigmaFile, project: FigmaTeamProject): SyncedObject {
    return {
      externalId: file.key,
      type: WorkspaceObjectType.FILE,
      title: file.name,
      content: undefined,
      url: `https://www.figma.com/file/${file.key}`,
      metadata: {
        projectId: project.id,
        projectName: project.name,
        thumbnailUrl: file.thumbnail_url,
      },
      externalUpdatedAt: new Date(file.last_modified),
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
    if (actionType === 'POST_FIGMA_COMMENT') {
      const fileKey = payload['fileKey'] as string;
      const message = payload['message'] as string;
      const clientMeta = payload['clientMeta'] ?? { x: 0, y: 0 };
      const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, client_meta: clientMeta }),
      });
      if (!response.ok) {
        return { success: false, errorMessage: `Figma API error: HTTP ${response.status}` };
      }
      const data = (await response.json()) as { id: string };
      return {
        success: true,
        externalId: data.id,
        url: `https://www.figma.com/file/${fileKey}?comment=${data.id}`,
      };
    }

    return {
      success: false,
      errorMessage: `Figma adapter: unsupported action type ${actionType}`,
    };
  }
}
