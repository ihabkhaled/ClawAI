import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import {
  CLAW_USER_AGENT,
  GITHUB_API_BASE,
  GITHUB_AUTH_BASE,
  GITHUB_SYNC_ISSUES_PER_REPO,
  GITHUB_SYNC_PRS_PER_REPO,
  GITHUB_SYNC_REPO_DEPTH,
  GITHUB_TOKEN_URL,
  HEALTH_CHECK_TIMEOUT_MS,
  OAUTH_PROBE_INVALID_CODE,
  OAUTH_PROBE_INVALID_REDIRECT_URI,
  WRITE_EXECUTION_TIMEOUT_MS,
} from '../../../common/constants/workspace.constants';
import { OAuthProbeOutcome } from '../enums/oauth-probe-outcome.enum';
import { probeOAuthAppCredentials } from '../utilities/oauth-app-probe.utility';
import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import type { AdapterAppCredentials, WorkspaceAdapter } from './workspace-adapter.interface';
import type { GitHubIssue, GitHubPull, GitHubRepo } from '../types/github-api.types';
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
export class GitHubAdapter implements WorkspaceAdapter {
  private readonly logger = new Logger(GitHubAdapter.name);

  async healthCheck(accessToken: string, _baseUrl?: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${GITHUB_API_BASE}/user`, {
        headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': CLAW_USER_AGENT,
      },
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
    const repos = await this.fetchUserRepos(accessToken, deltaToken);
    const objects: SyncedObject[] = repos.map((repo) => this.mapRepoToSynced(repo));

    const topRepos = repos.slice(0, GITHUB_SYNC_REPO_DEPTH);
    for (const repo of topRepos) {
      const issues = await this.safeFetchIssues(accessToken, repo.full_name);
      objects.push(...issues);
      const prs = await this.safeFetchPulls(accessToken, repo.full_name);
      objects.push(...prs);
    }

    return {
      objectsFound: objects.length,
      objectsSynced: objects.length,
      objectsFailed: 0,
      deltaTokenOut: new Date().toISOString(),
      objects,
    };
  }

  private async fetchUserRepos(
    accessToken: string,
    deltaToken?: string,
  ): Promise<Array<GitHubRepo>> {
    const params = new URLSearchParams({
      per_page: '100',
      ...(deltaToken ? { since: deltaToken } : {}),
    });
    const response = await fetch(`${GITHUB_API_BASE}/user/repos?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': CLAW_USER_AGENT,
      },
    });
    if (!response.ok) {
      throw new Error(`GitHub sync failed: HTTP ${response.status}`);
    }
    return (await response.json()) as Array<GitHubRepo>;
  }

  private mapRepoToSynced(repo: GitHubRepo): SyncedObject {
    return {
      externalId: String(repo.id),
      type: WorkspaceObjectType.REPOSITORY,
      title: repo.full_name,
      content: repo.description ?? undefined,
      url: repo.html_url,
      authorId: repo.owner.login,
      metadata: { fullName: repo.full_name },
      externalCreatedAt: new Date(repo.created_at),
      externalUpdatedAt: new Date(repo.updated_at),
    };
  }

  private async safeFetchIssues(accessToken: string, fullName: string): Promise<SyncedObject[]> {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${fullName}/issues?state=all&per_page=${String(GITHUB_SYNC_ISSUES_PER_REPO)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': CLAW_USER_AGENT,
          },
        },
      );
      if (!response.ok) {
        this.logger.warn(`issues fetch failed for ${fullName}: HTTP ${response.status}`);
        return [];
      }
      const items = (await response.json()) as Array<GitHubIssue>;
      return items
        .filter((i) => i.pull_request === undefined)
        .map((issue) => ({
          externalId: String(issue.id),
          type: WorkspaceObjectType.ISSUE,
          title: issue.title,
          content: issue.body ?? undefined,
          url: issue.html_url,
          authorId: issue.user?.login,
          metadata: {
            fullName,
            number: issue.number,
            state: issue.state,
          },
          externalCreatedAt: new Date(issue.created_at),
          externalUpdatedAt: new Date(issue.updated_at),
        }));
    } catch (error) {
      this.logger.warn(`issues fetch error for ${fullName}: ${String(error)}`);
      return [];
    }
  }

  private async safeFetchPulls(accessToken: string, fullName: string): Promise<SyncedObject[]> {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${fullName}/pulls?state=all&per_page=${String(GITHUB_SYNC_PRS_PER_REPO)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': CLAW_USER_AGENT,
          },
        },
      );
      if (!response.ok) {
        this.logger.warn(`pulls fetch failed for ${fullName}: HTTP ${response.status}`);
        return [];
      }
      const items = (await response.json()) as Array<GitHubPull>;
      return items.map((pr) => ({
        externalId: String(pr.id),
        type: WorkspaceObjectType.PULL_REQUEST,
        title: pr.title,
        content: pr.body ?? undefined,
        url: pr.html_url,
        authorId: pr.user?.login,
        metadata: {
          fullName,
          number: pr.number,
          state: pr.state,
          merged: pr.merged_at !== null,
        },
        externalCreatedAt: new Date(pr.created_at),
        externalUpdatedAt: new Date(pr.updated_at),
      }));
    } catch (error) {
      this.logger.warn(`pulls fetch error for ${fullName}: ${String(error)}`);
      return [];
    }
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    _codeVerifier: string | undefined,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('GitHub OAuth requires clientId and clientSecret from provider app config');
    }
    const response = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        // GitHub rejects requests without a User-Agent with HTTP 400.
        // See https://docs.github.com/en/rest/overview/resources-in-the-rest-api#user-agent-required
        'User-Agent': CLAW_USER_AGENT,
      },
      body: JSON.stringify({
        client_id: appCredentials.clientId,
        client_secret: appCredentials.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    // GitHub is quirky: semantic errors (bad code, wrong secret) come back
    // as HTTP 200 with an error body, NOT 4xx. So inspect the body too.
    const data = (await response.json().catch(() => null)) as
      | { access_token?: string; scope?: string; error?: string; error_description?: string }
      | null;
    if (!response.ok || data === null || data.error !== undefined || !data.access_token) {
      const reason = data?.error_description ?? data?.error ?? `HTTP ${response.status}`;
      throw new Error(`GitHub token exchange failed: ${reason}`);
    }
    return {
      accessToken: data.access_token,
      scopes: (data.scope ?? '').split(',').filter(Boolean),
    };
  }

  async refreshTokens(
    _refreshToken: string,
    _appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    throw new Error('GitHub PAT tokens do not support refresh — re-authorize required');
  }

  async validatePat(personalAccessToken: string): Promise<HealthCheckResult> {
    return this.healthCheck(personalAccessToken);
  }

  async validateOAuthAppConfig(appCredentials: AdapterAppCredentials): Promise<HealthCheckResult> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('GitHub OAuth probe requires clientId and clientSecret');
    }
    return probeOAuthAppCredentials({
      tokenUrl: GITHUB_TOKEN_URL,
      requestBuilder: () => ({
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: appCredentials.clientId,
          client_secret: appCredentials.clientSecret,
          code: OAUTH_PROBE_INVALID_CODE,
          redirect_uri: OAUTH_PROBE_INVALID_REDIRECT_URI,
        }),
      }),
      interpret: (payload) => {
        const data = payload as { error?: string } | null;
        const error = data?.error;
        if (error === 'bad_verification_code' || error === 'redirect_uri_mismatch') {
          return OAuthProbeOutcome.CREDENTIALS_OK;
        }
        if (error === 'incorrect_client_credentials' || error === 'invalid_client') {
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
      supportsDeltaSync: true,
      supportsWebhooks: true,
      objectTypes: ['REPOSITORY', 'ISSUE', 'PULL_REQUEST', 'COMMENT'],
    };
  }

  getAuthorizationBaseUrl(): string {
    return GITHUB_AUTH_BASE;
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
      'User-Agent': CLAW_USER_AGENT,
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

  async fetchObjectDetails(
    accessToken: string,
    externalId: string,
    objectType: string,
    metadata?: Record<string, unknown>,
  ): Promise<LiveObjectDetails | null> {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': CLAW_USER_AGENT,
    };
    const signal = AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS);

    if (objectType === WorkspaceObjectType.REPOSITORY) {
      const response = await fetch(`${GITHUB_API_BASE}/repositories/${externalId}`, {
        headers,
        signal,
      });
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`GitHub fetchObjectDetails failed: HTTP ${response.status}`);
      }
      const repo = (await response.json()) as GitHubRepo;
      return {
        externalId: String(repo.id),
        title: repo.full_name,
        content: repo.description,
        url: repo.html_url,
        authorId: repo.owner.login,
        externalCreatedAt: new Date(repo.created_at),
        externalUpdatedAt: new Date(repo.updated_at),
        metadata: {
          stargazers: repo.stargazers_count,
          forks: repo.forks_count,
          openIssues: repo.open_issues_count,
          defaultBranch: repo.default_branch,
          visibility: repo.visibility,
        },
      };
    }

    if (
      objectType === WorkspaceObjectType.ISSUE ||
      objectType === WorkspaceObjectType.PULL_REQUEST
    ) {
      const fullName = typeof metadata?.['fullName'] === 'string' ? metadata['fullName'] : null;
      const number = typeof metadata?.['number'] === 'number' ? metadata['number'] : null;
      if (fullName === null || number === null) {
        this.logger.warn(
          `GitHub refresh skipped for ${objectType} ${externalId}: missing fullName/number metadata`,
        );
        return null;
      }
      const segment = objectType === WorkspaceObjectType.ISSUE ? 'issues' : 'pulls';
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${fullName}/${segment}/${String(number)}`,
        { headers, signal },
      );
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`GitHub fetchObjectDetails failed: HTTP ${response.status}`);
      }
      const item = (await response.json()) as GitHubIssue | GitHubPull;
      return {
        externalId: String(item.id),
        title: item.title,
        content: item.body ?? null,
        url: item.html_url,
        authorId: item.user?.login ?? null,
        externalCreatedAt: new Date(item.created_at),
        externalUpdatedAt: new Date(item.updated_at),
        metadata: {
          fullName,
          number,
          state: item.state,
          ...(objectType === WorkspaceObjectType.PULL_REQUEST
            ? { merged: (item as GitHubPull).merged_at !== null }
            : {}),
        },
      };
    }

    return null;
  }
}
