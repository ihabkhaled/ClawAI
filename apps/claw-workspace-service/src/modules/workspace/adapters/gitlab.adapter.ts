import { Injectable, Logger } from '@nestjs/common';

import {
  GITLAB_AUTH_PATH,
  GITLAB_DEFAULT_API_BASE,
  GITLAB_DEFAULT_HOST,
  GITLAB_SYNC_ISSUES_PER_PROJECT,
  GITLAB_SYNC_MRS_PER_PROJECT,
  GITLAB_SYNC_PROJECT_DEPTH,
  GITLAB_TOKEN_PATH,
  HEALTH_CHECK_TIMEOUT_MS,
  OAUTH_PROBE_INVALID_CODE,
  OAUTH_PROBE_INVALID_REDIRECT_URI,
} from '../../../common/constants/workspace.constants';
import { OAuthProbeOutcome } from '../enums/oauth-probe-outcome.enum';
import { probeOAuthAppCredentials } from '../utilities/oauth-app-probe.utility';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import type { AdapterAppCredentials, WorkspaceAdapter } from './workspace-adapter.interface';
import type {
  GitLabIssue,
  GitLabMergeRequest,
  GitLabProject,
  GitLabTokenResponse,
} from '../types/gitlab-api.types';
import type {
  AdapterCapabilities,
  HealthCheckResult,
  LiveObjectDetails,
  OAuthTokenSet,
  SyncedObject,
  SyncResult,
} from '../types/workspace.types';

@Injectable()
export class GitLabAdapter implements WorkspaceAdapter {
  private readonly logger = new Logger(GitLabAdapter.name);

  async healthCheck(accessToken: string, baseUrl?: string): Promise<HealthCheckResult> {
    const api = this.resolveApiBase(baseUrl);
    const start = Date.now();
    try {
      const response = await fetch(`${api}/user`, {
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
      this.logger.warn(`GitLab health check failed: ${message}`);
      return {
        status: WorkspaceConnectorStatus.DISCONNECTED,
        latencyMs: Date.now() - start,
        errorMessage: message,
      };
    }
  }

  async syncObjects(accessToken: string, _deltaToken?: string): Promise<SyncResult> {
    const projects = await this.fetchProjects(accessToken);
    const objects: SyncedObject[] = projects.map((p) => this.mapProjectToSynced(p));

    const top = projects.slice(0, GITLAB_SYNC_PROJECT_DEPTH);
    for (const project of top) {
      const issues = await this.safeFetchIssues(accessToken, project.id);
      objects.push(...issues);
      const mrs = await this.safeFetchMergeRequests(accessToken, project.id);
      objects.push(...mrs);
    }

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
      throw new Error('GitLab OAuth requires clientId and clientSecret');
    }
    const tokenUrl = this.resolveHost(appCredentials.baseUrl) + GITLAB_TOKEN_PATH;
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      code,
      redirect_uri: redirectUri,
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    });
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(`GitLab token exchange failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as GitLabTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  async refreshTokens(
    refreshToken: string,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('GitLab refresh requires clientId and clientSecret');
    }
    const tokenUrl = this.resolveHost(appCredentials.baseUrl) + GITLAB_TOKEN_PATH;
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      refresh_token: refreshToken,
    });
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(`GitLab token refresh failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as GitLabTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  async validatePat(personalAccessToken: string, baseUrl?: string): Promise<HealthCheckResult> {
    return this.healthCheck(personalAccessToken, baseUrl);
  }

  async validateOAuthAppConfig(appCredentials: AdapterAppCredentials): Promise<HealthCheckResult> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('GitLab OAuth probe requires clientId and clientSecret');
    }
    const tokenUrl = this.resolveHost(appCredentials.baseUrl) + GITLAB_TOKEN_PATH;
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
        const data = payload as { error?: string } | null;
        const error = data?.error;
        if (error === 'invalid_grant' || error === 'invalid_request') {
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
      supportsPat: true,
      supportsDeltaSync: false,
      supportsWebhooks: true,
      objectTypes: ['REPOSITORY', 'ISSUE', 'PULL_REQUEST'],
    };
  }

  getAuthorizationBaseUrl(): string {
    return GITLAB_DEFAULT_HOST + GITLAB_AUTH_PATH;
  }

  getDefaultScopes(): string[] {
    return ['read_api', 'read_repository', 'read_user'];
  }

  async fetchObjectDetails(
    accessToken: string,
    externalId: string,
    objectType: string,
    metadata?: Record<string, unknown>,
  ): Promise<LiveObjectDetails | null> {
    const api = this.resolveApiBase(
      typeof metadata?.['apiBaseUrl'] === 'string' ? (metadata['apiBaseUrl'] as string) : undefined,
    );
    const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };
    const signal = AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS);

    if (objectType === WorkspaceObjectType.REPOSITORY) {
      const response = await fetch(`${api}/projects/${externalId}`, { headers, signal });
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`GitLab fetchObjectDetails failed: HTTP ${response.status}`);
      }
      const p = (await response.json()) as GitLabProject;
      return this.mapProjectToLive(p);
    }

    if (
      objectType === WorkspaceObjectType.ISSUE ||
      objectType === WorkspaceObjectType.PULL_REQUEST
    ) {
      const projectId = metadata?.['projectId'];
      const iid = metadata?.['iid'];
      if (typeof projectId !== 'number' || typeof iid !== 'number') {
        this.logger.warn(`GitLab refresh skipped for ${objectType}: missing projectId/iid`);
        return null;
      }
      const segment = objectType === WorkspaceObjectType.ISSUE ? 'issues' : 'merge_requests';
      const response = await fetch(
        `${api}/projects/${String(projectId)}/${segment}/${String(iid)}`,
        { headers, signal },
      );
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`GitLab fetchObjectDetails failed: HTTP ${response.status}`);
      }
      const item = (await response.json()) as GitLabIssue | GitLabMergeRequest;
      return {
        externalId: String(item.id),
        title: item.title,
        content: item.description ?? null,
        url: item.web_url,
        authorId: item.author?.username ?? null,
        externalCreatedAt: new Date(item.created_at),
        externalUpdatedAt: new Date(item.updated_at),
        metadata: {
          projectId,
          iid,
          state: item.state,
          ...(objectType === WorkspaceObjectType.PULL_REQUEST
            ? { merged: (item as GitLabMergeRequest).merged_at !== null }
            : {}),
        },
      };
    }

    return null;
  }

  private resolveApiBase(baseUrl?: string): string {
    if (baseUrl === undefined || baseUrl.length === 0) {
      return GITLAB_DEFAULT_API_BASE;
    }
    const trimmed = baseUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api/v4') ? trimmed : `${trimmed}/api/v4`;
  }

  private resolveHost(baseUrl?: string): string {
    if (baseUrl === undefined || baseUrl.length === 0) {
      return GITLAB_DEFAULT_HOST;
    }
    return baseUrl.replace(/\/+$/, '').replace(/\/api\/v4$/, '');
  }

  private normalizeTokenResponse(data: GitLabTokenResponse): OAuthTokenSet {
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

  private async fetchProjects(accessToken: string): Promise<GitLabProject[]> {
    const response = await fetch(
      `${GITLAB_DEFAULT_API_BASE}/projects?membership=true&order_by=last_activity_at&per_page=100`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
    );
    if (!response.ok) {
      throw new Error(`GitLab sync failed: HTTP ${response.status}`);
    }
    return (await response.json()) as GitLabProject[];
  }

  private mapProjectToSynced(project: GitLabProject): SyncedObject {
    return {
      externalId: String(project.id),
      type: WorkspaceObjectType.REPOSITORY,
      title: project.path_with_namespace,
      content: project.description ?? undefined,
      url: project.web_url,
      authorId: project.owner?.username ?? project.namespace?.full_path,
      metadata: { projectId: project.id, pathWithNamespace: project.path_with_namespace },
      externalCreatedAt: new Date(project.created_at),
      externalUpdatedAt: new Date(project.last_activity_at),
    };
  }

  private mapProjectToLive(project: GitLabProject): LiveObjectDetails {
    return {
      externalId: String(project.id),
      title: project.path_with_namespace,
      content: project.description,
      url: project.web_url,
      authorId: project.owner?.username ?? project.namespace?.full_path ?? null,
      externalCreatedAt: new Date(project.created_at),
      externalUpdatedAt: new Date(project.last_activity_at),
      metadata: {
        stars: project.star_count,
        forks: project.forks_count,
        openIssues: project.open_issues_count,
        defaultBranch: project.default_branch,
        visibility: project.visibility,
      },
    };
  }

  private async safeFetchIssues(accessToken: string, projectId: number): Promise<SyncedObject[]> {
    try {
      const response = await fetch(
        `${GITLAB_DEFAULT_API_BASE}/projects/${String(projectId)}/issues?per_page=${String(GITLAB_SYNC_ISSUES_PER_PROJECT)}&order_by=updated_at`,
        { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
      );
      if (!response.ok) {
        this.logger.warn(
          `issues fetch failed for project ${String(projectId)}: HTTP ${response.status}`,
        );
        return [];
      }
      const items = (await response.json()) as GitLabIssue[];
      return items.map((issue) => ({
        externalId: String(issue.id),
        type: WorkspaceObjectType.ISSUE,
        title: issue.title,
        content: issue.description ?? undefined,
        url: issue.web_url,
        authorId: issue.author?.username,
        metadata: { projectId, iid: issue.iid, state: issue.state },
        externalCreatedAt: new Date(issue.created_at),
        externalUpdatedAt: new Date(issue.updated_at),
      }));
    } catch (error) {
      this.logger.warn(`GitLab issues error project=${String(projectId)}: ${String(error)}`);
      return [];
    }
  }

  private async safeFetchMergeRequests(
    accessToken: string,
    projectId: number,
  ): Promise<SyncedObject[]> {
    try {
      const response = await fetch(
        `${GITLAB_DEFAULT_API_BASE}/projects/${String(projectId)}/merge_requests?per_page=${String(GITLAB_SYNC_MRS_PER_PROJECT)}&order_by=updated_at`,
        { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
      );
      if (!response.ok) {
        this.logger.warn(
          `MRs fetch failed for project ${String(projectId)}: HTTP ${response.status}`,
        );
        return [];
      }
      const items = (await response.json()) as GitLabMergeRequest[];
      return items.map((mr) => ({
        externalId: String(mr.id),
        type: WorkspaceObjectType.PULL_REQUEST,
        title: mr.title,
        content: mr.description ?? undefined,
        url: mr.web_url,
        authorId: mr.author?.username,
        metadata: {
          projectId,
          iid: mr.iid,
          state: mr.state,
          merged: mr.merged_at !== null,
        },
        externalCreatedAt: new Date(mr.created_at),
        externalUpdatedAt: new Date(mr.updated_at),
      }));
    } catch (error) {
      this.logger.warn(`GitLab MRs error project=${String(projectId)}: ${String(error)}`);
      return [];
    }
  }
}
