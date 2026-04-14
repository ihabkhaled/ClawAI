import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import {
  GITHUB_API_BASE,
  GITHUB_AUTH_BASE,
  GITHUB_TOKEN_URL,
  HEALTH_CHECK_TIMEOUT_MS,
} from '../../../common/constants/workspace.constants';
import type { WorkspaceAdapter } from './workspace-adapter.interface';
import type {
  AdapterCapabilities,
  HealthCheckResult,
  OAuthTokenSet,
  SyncResult,
} from '../types/workspace.types';

@Injectable()
export class GitHubAdapter implements WorkspaceAdapter {
  private readonly logger = new Logger(GitHubAdapter.name);

  async healthCheck(accessToken: string, _baseUrl?: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${GITHUB_API_BASE}/user`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' },
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
          errorMessage: 'Unauthorized — invalid token',
        };
      }
      return {
        status: WorkspaceConnectorStatus.DEGRADED,
        latencyMs,
        errorMessage: `HTTP ${response.status}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`GitHub health check failed: ${message}`);
      return {
        status: WorkspaceConnectorStatus.DISCONNECTED,
        latencyMs: Date.now() - start,
        errorMessage: message,
      };
    }
  }

  async syncObjects(accessToken: string, deltaToken?: string): Promise<SyncResult> {
    const params = new URLSearchParams({
      per_page: '100',
      ...(deltaToken ? { since: deltaToken } : {}),
    });
    const response = await fetch(`${GITHUB_API_BASE}/user/repos?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) {
      throw new Error(`GitHub sync failed: HTTP ${response.status}`);
    }
    const repos = (await response.json()) as unknown[];
    const nextDeltaToken = new Date().toISOString();
    return {
      objectsFound: repos.length,
      objectsSynced: repos.length,
      objectsFailed: 0,
      deltaTokenOut: nextDeltaToken,
    };
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    _codeVerifier?: string,
  ): Promise<OAuthTokenSet> {
    const config = AppConfig.get();
    const response = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.GITHUB_CLIENT_ID,
        client_secret: config.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!response.ok) {
      throw new Error(`GitHub token exchange failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as { access_token: string; scope: string };
    return {
      accessToken: data['access_token'],
      scopes: (data['scope'] ?? '').split(',').filter(Boolean),
    };
  }

  async refreshTokens(_refreshToken: string): Promise<OAuthTokenSet> {
    throw new Error('GitHub PAT tokens do not support refresh — re-authorize required');
  }

  getCapabilities(): AdapterCapabilities {
    return {
      supportsOAuth: true,
      supportsPat: true,
      supportsDeltaSync: true,
      supportsWebhooks: true,
      objectTypes: ['REPOSITORY', 'ISSUE', 'PULL_REQUEST', 'COMMENT'],
    };
  }

  getAuthorizationBaseUrl(): string {
    return GITHUB_AUTH_BASE;
  }

  getClientId(): string {
    return AppConfig.get().GITHUB_CLIENT_ID;
  }

  getDefaultScopes(): string[] {
    return ['repo', 'read:user', 'read:org'];
  }
}
