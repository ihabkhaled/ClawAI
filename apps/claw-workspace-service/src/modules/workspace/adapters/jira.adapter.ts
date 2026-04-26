import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import {
  HEALTH_CHECK_TIMEOUT_MS,
  JIRA_API_BASE,
  JIRA_API_RESOURCES,
  JIRA_AUTH_URL,
  JIRA_TOKEN_URL,
  OAUTH_PROBE_INVALID_CODE,
  OAUTH_PROBE_INVALID_REDIRECT_URI,
  WRITE_EXECUTION_TIMEOUT_MS,
} from '../../../common/constants/workspace.constants';
import { OAuthProbeOutcome } from '../enums/oauth-probe-outcome.enum';
import { probeOAuthAppCredentials } from '../utilities/oauth-app-probe.utility';
import { buildOAuthErrorMessage } from '../utilities/oauth-error.utility';
import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import type { AdapterAppCredentials, WorkspaceAdapter } from './workspace-adapter.interface';
import type {
  AdapterCapabilities,
  HealthCheckResult,
  OAuthTokenSet,
  SyncedObject,
  SyncResult,
  WriteActionResult,
} from '../types/workspace.types';

@Injectable()
export class JiraAdapter implements WorkspaceAdapter {
  private readonly logger = new Logger(JiraAdapter.name);

  async healthCheck(accessToken: string, _baseUrl?: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(JIRA_API_RESOURCES, {
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
      this.logger.warn(`Jira health check failed: ${message}`);
      return {
        status: WorkspaceConnectorStatus.DISCONNECTED,
        latencyMs: Date.now() - start,
        errorMessage: message,
      };
    }
  }

  async syncObjects(accessToken: string, deltaToken?: string): Promise<SyncResult> {
    const resourcesResponse = await fetch(JIRA_API_RESOURCES, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (!resourcesResponse.ok) {
      throw new Error(`Failed to fetch Jira resources: HTTP ${resourcesResponse.status}`);
    }
    const resources = (await resourcesResponse.json()) as Array<{ id: string; url: string }>;
    const site = resources[0];
    if (site === undefined) {
      return { objectsFound: 0, objectsSynced: 0, objectsFailed: 0, objects: [] };
    }
    // /rest/api/3/search was removed; migrate to /rest/api/3/search/jql.
    // Breaking changes we handle here:
    //   - `fields` defaults to `id` only on the new endpoint; we must request what we use.
    //   - `total` is no longer returned; pagination is token-based via `nextPageToken`+`isLast`.
    //   - `self` is a top-level property on the issue, not inside `fields`.
    // OAuth 2.0 (3LO) tokens must hit https://api.atlassian.com/ex/jira/{cloudId}/... —
    // not the direct tenant URL (site.url), which rejects bearer tokens with 401.
    const apiBaseUrl = `${JIRA_API_BASE}/ex/jira/${site.id}/rest/api/3`;
    // Phase 5: delta cursor is an ISO timestamp from last successful sync.
    // Use `updated >= "<ISO>"` for true incremental fetch; fall back to 30d window
    // on first run (or when cursor is stale and we want a safety net).
    const jql = this.buildJqlForDelta(deltaToken);
    const searchParams = new URLSearchParams({
      jql,
      maxResults: '100',
      fields: 'summary,assignee,created,updated',
    });
    const searchUrl = `${apiBaseUrl}/search/jql?${searchParams.toString()}`;
    const issueResponse = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    this.logger.debug(`Jira search: ${searchUrl}`);
    if (!issueResponse.ok) {
      const errorBody = await issueResponse.text().catch(() => '');
      this.logger.error(`Jira issue fetch failed: HTTP ${issueResponse.status} ${errorBody}`);
      throw new Error(`Jira issue fetch failed: HTTP ${issueResponse.status}`);
    }
    const data = (await issueResponse.json()) as {
      issues: Array<{
        id: string;
        key: string;
        fields: {
          summary: string;
          assignee?: { emailAddress?: string } | null;
          created: string;
          updated: string;
        };
      }>;
      nextPageToken?: string;
      isLast?: boolean;
    };
    const objects: SyncedObject[] = data.issues.map((issue) => ({
      externalId: issue.id,
      type: WorkspaceObjectType.TICKET,
      title: `${issue.key}: ${issue.fields.summary}`,
      authorId: issue.fields.assignee?.emailAddress,
      // Prefer the browser-facing tenant URL over issue.self (which is the API URL).
      url: `${site.url}/browse/${issue.key}`,
      externalCreatedAt: new Date(issue.fields.created),
      externalUpdatedAt: new Date(issue.fields.updated),
    }));
    const latestUpdatedAt = objects
      .map((obj) => obj.externalUpdatedAt?.toISOString())
      .filter((value): value is string => value !== undefined)
      .sort()
      .at(-1);
    return {
      objectsFound: objects.length,
      objectsSynced: objects.length,
      objectsFailed: 0,
      deltaTokenOut: latestUpdatedAt ?? deltaToken ?? new Date().toISOString(),
      objects,
    };
  }

  private buildJqlForDelta(deltaToken?: string): string {
    if (deltaToken === undefined || deltaToken.length === 0) {
      return 'updated >= -30d ORDER BY updated DESC';
    }
    const parsed = new Date(deltaToken);
    if (Number.isNaN(parsed.getTime())) {
      return 'updated >= -30d ORDER BY updated DESC';
    }
    // Jira JQL accepts `updated >= "YYYY-MM-DD HH:mm"` format.
    const stamp = parsed.toISOString().replace('T', ' ').slice(0, 16);
    return `updated >= "${stamp}" ORDER BY updated DESC`;
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    codeVerifier: string | undefined,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Jira OAuth requires clientId and clientSecret from provider app config');
    }
    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      code,
      redirect_uri: redirectUri,
    };
    if (codeVerifier !== undefined) {
      body['code_verifier'] = codeVerifier;
    }
    const response = await fetch(JIRA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(await buildOAuthErrorMessage('Jira', 'token exchange', response));
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
        'Jira OAuth refresh requires clientId and clientSecret from provider app config',
      );
    }
    const body = {
      grant_type: 'refresh_token',
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      refresh_token: refreshToken,
    };
    const response = await fetch(JIRA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(await buildOAuthErrorMessage('Jira', 'token refresh', response));
    }
    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };
    const expiresAt = data['expires_in']
      ? new Date(Date.now() + data['expires_in'] * 1000)
      : undefined;
    return {
      accessToken: data['access_token'],
      refreshToken: data['refresh_token'] ?? refreshToken,
      expiresAt,
      scopes: [],
    };
  }

  async validateOAuthAppConfig(appCredentials: AdapterAppCredentials): Promise<HealthCheckResult> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Jira OAuth probe requires clientId and clientSecret');
    }
    return probeOAuthAppCredentials({
      tokenUrl: JIRA_TOKEN_URL,
      requestBuilder: () => ({
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: appCredentials.clientId,
          client_secret: appCredentials.clientSecret,
          code: OAUTH_PROBE_INVALID_CODE,
          redirect_uri: OAUTH_PROBE_INVALID_REDIRECT_URI,
        }),
      }),
      interpret: (payload, status) => {
        const data = payload as { error?: string } | null;
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
      supportsDeltaSync: true,
      supportsWebhooks: true,
      objectTypes: ['TICKET', 'PROJECT', 'COMMENT'],
    };
  }

  getAuthorizationBaseUrl(): string {
    return JIRA_AUTH_URL;
  }

  getDefaultScopes(): string[] {
    return ['read:jira-work', 'read:jira-user', 'offline_access'];
  }

  supportsWrite(): boolean {
    return true;
  }

  async executeWriteAction(
    accessToken: string,
    actionType: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    const signal = AbortSignal.timeout(WRITE_EXECUTION_TIMEOUT_MS);
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    // Resolve cloud ID (site) to build API URL
    const resourcesResponse = await fetch(JIRA_API_RESOURCES, { headers, signal });
    if (!resourcesResponse.ok) {
      return {
        success: false,
        errorMessage: `Jira site lookup failed: HTTP ${resourcesResponse.status}`,
      };
    }
    const resources = (await resourcesResponse.json()) as Array<{ id: string; url: string }>;
    const site = resources[0];
    if (site === undefined) {
      return { success: false, errorMessage: 'No Jira site accessible with this token' };
    }
    const baseUrl = `${JIRA_API_BASE}/ex/jira/${site.id}/rest/api/3`;

    if (actionType === 'CREATE_TICKET' || actionType === 'CREATE_JIRA_FROM_FIGMA') {
      const response = await fetch(`${baseUrl}/issue`, {
        method: 'POST',
        headers,
        signal,
        body: JSON.stringify({
          fields: {
            project: { key: payload['projectKey'] },
            summary: payload['summary'],
            description: payload['description'] ?? null,
            issuetype: { name: payload['issueType'] ?? 'Task' },
            ...(Array.isArray(payload['labels']) ? { labels: payload['labels'] } : {}),
          },
        }),
      });
      if (!response.ok) {
        return { success: false, errorMessage: `Jira API error: HTTP ${response.status}` };
      }
      const issue = (await response.json()) as { id: string; key: string; self: string };
      return {
        success: true,
        externalId: issue.key,
        url: `${site.url}/browse/${issue.key}`,
      };
    }

    if (actionType === 'UPDATE_JIRA_ISSUE') {
      const issueKey = payload['issueKey'] as string;
      const response = await fetch(`${baseUrl}/issue/${issueKey}`, {
        method: 'PUT',
        headers,
        signal,
        body: JSON.stringify({ fields: payload['fields'] ?? {} }),
      });
      if (!response.ok) {
        return { success: false, errorMessage: `Jira API error: HTTP ${response.status}` };
      }
      return {
        success: true,
        externalId: issueKey,
        url: `${site.url}/browse/${issueKey}`,
      };
    }

    if (actionType === 'ADD_TICKET_COMMENT' || actionType === 'COMMENT_JIRA') {
      const issueKey = payload['issueKey'] as string;
      const response = await fetch(`${baseUrl}/issue/${issueKey}/comment`, {
        method: 'POST',
        headers,
        signal,
        body: JSON.stringify({
          body: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: payload['body'] as string }],
              },
            ],
          },
        }),
      });
      if (!response.ok) {
        return { success: false, errorMessage: `Jira API error: HTTP ${response.status}` };
      }
      const comment = (await response.json()) as { id: string };
      return { success: true, externalId: comment.id };
    }

    return { success: false, errorMessage: `Jira adapter: unsupported action type ${actionType}` };
  }
}
