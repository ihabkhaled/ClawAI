import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import {
  GITHUB_API_BASE,
  GITHUB_AUTH_BASE,
  GITHUB_TOKEN_URL,
  HEALTH_CHECK_TIMEOUT_MS,
  WRITE_EXECUTION_TIMEOUT_MS,
} from '../../../common/constants/workspace.constants';
import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import type { WorkspaceAdapter } from './workspace-adapter.interface';
import type {
  AdapterCapabilities,
  HealthCheckResult,
  OAuthTokenSet,
  SyncedObject,
  SyncResult,
  WriteActionResult,
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
    const repos = (await response.json()) as Array<{
      id: number;
      full_name: string;
      description: string | null;
      html_url: string;
      owner: { login: string };
      created_at: string;
      updated_at: string;
    }>;
    const objects: SyncedObject[] = repos.map((repo) => ({
      externalId: String(repo.id),
      type: WorkspaceObjectType.REPOSITORY,
      title: repo.full_name,
      content: repo.description ?? undefined,
      url: repo.html_url,
      authorId: repo.owner.login,
      externalCreatedAt: new Date(repo.created_at),
      externalUpdatedAt: new Date(repo.updated_at),
    }));
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
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };
    const signal = AbortSignal.timeout(WRITE_EXECUTION_TIMEOUT_MS);

    if (actionType === 'CREATE_ISSUE') {
      const owner = payload['owner'] as string;
      const repo = payload['repo'] as string;
      const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues`, {
        method: 'POST',
        headers,
        signal,
        body: JSON.stringify({
          title: payload['title'],
          body: payload['body'],
          labels: payload['labels'] ?? [],
        }),
      });
      if (!response.ok) {
        return { success: false, errorMessage: `GitHub API error: HTTP ${response.status}` };
      }
      const issue = (await response.json()) as { number: number; html_url: string };
      return { success: true, externalId: String(issue.number), url: issue.html_url };
    }

    if (actionType === 'CREATE_ISSUE_COMMENT') {
      const owner = payload['owner'] as string;
      const repo = payload['repo'] as string;
      const issueNumber = payload['issueNumber'] as number;
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
        {
          method: 'POST',
          headers,
          signal,
          body: JSON.stringify({ body: payload['body'] }),
        },
      );
      if (!response.ok) {
        return { success: false, errorMessage: `GitHub API error: HTTP ${response.status}` };
      }
      const comment = (await response.json()) as { id: number; html_url: string };
      return { success: true, externalId: String(comment.id), url: comment.html_url };
    }

    if (actionType === 'CREATE_PR_DESCRIPTION') {
      const owner = payload['owner'] as string;
      const repo = payload['repo'] as string;
      const pullNumber = payload['pullNumber'] as number;
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${pullNumber}`,
        {
          method: 'PATCH',
          headers,
          signal,
          body: JSON.stringify({ body: payload['body'] }),
        },
      );
      if (!response.ok) {
        return { success: false, errorMessage: `GitHub API error: HTTP ${response.status}` };
      }
      const pr = (await response.json()) as { number: number; html_url: string };
      return { success: true, externalId: String(pr.number), url: pr.html_url };
    }

    return {
      success: false,
      errorMessage: `GitHub adapter: unsupported action type ${actionType}`,
    };
  }
}
