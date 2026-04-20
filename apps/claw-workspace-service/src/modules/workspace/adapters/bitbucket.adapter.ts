import { Injectable, Logger } from '@nestjs/common';

import {
  BITBUCKET_API_BASE,
  BITBUCKET_AUTH_URL,
  BITBUCKET_SYNC_PRS_PER_REPO,
  BITBUCKET_SYNC_REPO_LIMIT,
  BITBUCKET_TOKEN_URL,
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
  BitbucketPaginated,
  BitbucketPullRequest,
  BitbucketRepository,
  BitbucketTokenResponse,
} from '../types/bitbucket-api.types';
import type {
  AdapterCapabilities,
  HealthCheckResult,
  LiveObjectDetails,
  OAuthTokenSet,
  SyncedObject,
  SyncResult,
} from '../types/workspace.types';

@Injectable()
export class BitbucketAdapter implements WorkspaceAdapter {
  private readonly logger = new Logger(BitbucketAdapter.name);

  async healthCheck(accessToken: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${BITBUCKET_API_BASE}/user`, {
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
      this.logger.warn(`Bitbucket health check failed: ${message}`);
      return {
        status: WorkspaceConnectorStatus.DISCONNECTED,
        latencyMs: Date.now() - start,
        errorMessage: message,
      };
    }
  }

  async syncObjects(accessToken: string, _deltaToken?: string): Promise<SyncResult> {
    const repos = await this.fetchUserRepositories(accessToken);
    const objects: SyncedObject[] = repos.map((r) => this.mapRepoToSynced(r));

    for (const repo of repos.slice(0, 3)) {
      const prs = await this.safeFetchPullRequests(accessToken, repo.full_name);
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

  async exchangeCodeForTokens(
    code: string,
    _redirectUri: string,
    _codeVerifier: string | undefined,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Bitbucket OAuth requires clientId and clientSecret');
    }
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
    });
    const basic = Buffer.from(`${appCredentials.clientId}:${appCredentials.clientSecret}`).toString(
      'base64',
    );
    const response = await fetch(BITBUCKET_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(`Bitbucket token exchange failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as BitbucketTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  async refreshTokens(
    refreshToken: string,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Bitbucket refresh requires clientId and clientSecret');
    }
    const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
    const basic = Buffer.from(`${appCredentials.clientId}:${appCredentials.clientSecret}`).toString(
      'base64',
    );
    const response = await fetch(BITBUCKET_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(`Bitbucket token refresh failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as BitbucketTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  async validateOAuthAppConfig(appCredentials: AdapterAppCredentials): Promise<HealthCheckResult> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Bitbucket OAuth probe requires clientId and clientSecret');
    }
    const basic = Buffer.from(`${appCredentials.clientId}:${appCredentials.clientSecret}`).toString(
      'base64',
    );
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: OAUTH_PROBE_INVALID_CODE,
      redirect_uri: OAUTH_PROBE_INVALID_REDIRECT_URI,
    });
    return probeOAuthAppCredentials({
      tokenUrl: BITBUCKET_TOKEN_URL,
      requestBuilder: () => ({
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      }),
      interpret: (payload, status) => {
        const data = payload as { error?: string; error_description?: string } | null;
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
      supportsWebhooks: true,
      objectTypes: ['REPOSITORY', 'PULL_REQUEST'],
    };
  }

  getAuthorizationBaseUrl(): string {
    return BITBUCKET_AUTH_URL;
  }

  getDefaultScopes(): string[] {
    return ['repository', 'pullrequest', 'account'];
  }

  async fetchObjectDetails(
    accessToken: string,
    externalId: string,
    objectType: string,
    metadata?: Record<string, unknown>,
  ): Promise<LiveObjectDetails | null> {
    const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };
    const signal = AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS);

    if (objectType === WorkspaceObjectType.REPOSITORY) {
      const fullName = typeof metadata?.['fullName'] === 'string' ? metadata['fullName'] : null;
      if (fullName === null) {
        this.logger.warn(
          `Bitbucket refresh skipped for REPOSITORY ${externalId}: missing fullName`,
        );
        return null;
      }
      const response = await fetch(`${BITBUCKET_API_BASE}/repositories/${fullName}`, {
        headers,
        signal,
      });
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Bitbucket fetchObjectDetails failed: HTTP ${response.status}`);
      }
      const repo = (await response.json()) as BitbucketRepository;
      return this.mapRepoToLive(repo);
    }

    if (objectType === WorkspaceObjectType.PULL_REQUEST) {
      const fullName = typeof metadata?.['fullName'] === 'string' ? metadata['fullName'] : null;
      const prId = typeof metadata?.['prId'] === 'number' ? metadata['prId'] : null;
      if (fullName === null || prId === null) {
        this.logger.warn(
          `Bitbucket refresh skipped for PULL_REQUEST: missing fullName/prId metadata`,
        );
        return null;
      }
      const response = await fetch(
        `${BITBUCKET_API_BASE}/repositories/${fullName}/pullrequests/${String(prId)}`,
        { headers, signal },
      );
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Bitbucket fetchObjectDetails failed: HTTP ${response.status}`);
      }
      const pr = (await response.json()) as BitbucketPullRequest;
      return {
        externalId: String(pr.id),
        title: pr.title,
        content: pr.description ?? null,
        url: pr.links.html.href,
        authorId: pr.author?.username ?? pr.author?.display_name ?? null,
        externalCreatedAt: new Date(pr.created_on),
        externalUpdatedAt: new Date(pr.updated_on),
        metadata: { fullName, prId, state: pr.state },
      };
    }

    return null;
  }

  private normalizeTokenResponse(data: BitbucketTokenResponse): OAuthTokenSet {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt:
        data.expires_in !== undefined && data.expires_in !== null
          ? new Date(Date.now() + data.expires_in * 1000)
          : undefined,
      scopes: data.scopes !== undefined ? data.scopes.split(' ').filter(Boolean) : [],
    };
  }

  private async fetchUserRepositories(accessToken: string): Promise<BitbucketRepository[]> {
    const response = await fetch(
      `${BITBUCKET_API_BASE}/repositories?role=member&pagelen=${String(BITBUCKET_SYNC_REPO_LIMIT)}&sort=-updated_on`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
    );
    if (!response.ok) {
      throw new Error(`Bitbucket sync failed: HTTP ${response.status}`);
    }
    const page = (await response.json()) as BitbucketPaginated<BitbucketRepository>;
    return page.values;
  }

  private mapRepoToSynced(repo: BitbucketRepository): SyncedObject {
    return {
      externalId: repo.uuid,
      type: WorkspaceObjectType.REPOSITORY,
      title: repo.full_name,
      content: repo.description ?? undefined,
      url: repo.links.html.href,
      authorId: repo.owner.username ?? repo.owner.display_name,
      metadata: {
        fullName: repo.full_name,
        isPrivate: repo.is_private,
        defaultBranch: repo.mainbranch?.name ?? null,
      },
      externalCreatedAt: new Date(repo.created_on),
      externalUpdatedAt: new Date(repo.updated_on),
    };
  }

  private mapRepoToLive(repo: BitbucketRepository): LiveObjectDetails {
    return {
      externalId: repo.uuid,
      title: repo.full_name,
      content: repo.description,
      url: repo.links.html.href,
      authorId: repo.owner.username ?? repo.owner.display_name ?? null,
      externalCreatedAt: new Date(repo.created_on),
      externalUpdatedAt: new Date(repo.updated_on),
      metadata: {
        fullName: repo.full_name,
        isPrivate: repo.is_private,
        defaultBranch: repo.mainbranch?.name ?? null,
      },
    };
  }

  private async safeFetchPullRequests(
    accessToken: string,
    fullName: string,
  ): Promise<SyncedObject[]> {
    try {
      const response = await fetch(
        `${BITBUCKET_API_BASE}/repositories/${fullName}/pullrequests?pagelen=${String(BITBUCKET_SYNC_PRS_PER_REPO)}&sort=-updated_on`,
        { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
      );
      if (!response.ok) {
        this.logger.warn(`PR fetch failed for ${fullName}: HTTP ${response.status}`);
        return [];
      }
      const page = (await response.json()) as BitbucketPaginated<BitbucketPullRequest>;
      return page.values.map((pr) => ({
        externalId: String(pr.id),
        type: WorkspaceObjectType.PULL_REQUEST,
        title: pr.title,
        content: pr.description ?? undefined,
        url: pr.links.html.href,
        authorId: pr.author?.username ?? pr.author?.display_name,
        metadata: { fullName, prId: pr.id, state: pr.state },
        externalCreatedAt: new Date(pr.created_on),
        externalUpdatedAt: new Date(pr.updated_on),
      }));
    } catch (error) {
      this.logger.warn(`Bitbucket PRs error for ${fullName}: ${String(error)}`);
      return [];
    }
  }
}
