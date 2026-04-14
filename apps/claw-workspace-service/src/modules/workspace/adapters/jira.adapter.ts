import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import {
  HEALTH_CHECK_TIMEOUT_MS,
  JIRA_API_BASE,
  JIRA_API_RESOURCES,
  JIRA_AUTH_URL,
  JIRA_TOKEN_URL,
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

  async syncObjects(accessToken: string, _deltaToken?: string): Promise<SyncResult> {
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
    const issueResponse = await fetch(
      `${site.url}/rest/api/3/search?maxResults=100&jql=ORDER+BY+updated+DESC`,
      {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      },
    );
    if (!issueResponse.ok) {
      throw new Error(`Jira issue fetch failed: HTTP ${issueResponse.status}`);
    }
    const data = (await issueResponse.json()) as {
      total: number;
      issues: Array<{
        id: string;
        key: string;
        fields: {
          summary: string;
          description?: unknown;
          assignee?: { emailAddress: string };
          created: string;
          updated: string;
          self: string;
        };
      }>;
    };
    const objects: SyncedObject[] = data.issues.map((issue) => ({
      externalId: issue.id,
      type: WorkspaceObjectType.TICKET,
      title: `${issue.key}: ${issue.fields.summary}`,
      authorId: issue.fields.assignee?.emailAddress,
      url: issue.fields.self,
      externalCreatedAt: new Date(issue.fields.created),
      externalUpdatedAt: new Date(issue.fields.updated),
    }));
    return {
      objectsFound: data.total,
      objectsSynced: objects.length,
      objectsFailed: 0,
      objects,
    };
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<OAuthTokenSet> {
    const config = AppConfig.get();
    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: config.JIRA_CLIENT_ID,
      client_secret: config.JIRA_CLIENT_SECRET,
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

  async refreshTokens(refreshToken: string): Promise<OAuthTokenSet> {
    const config = AppConfig.get();
    const body = {
      grant_type: 'refresh_token',
      client_id: config.JIRA_CLIENT_ID,
      client_secret: config.JIRA_CLIENT_SECRET,
      refresh_token: refreshToken,
    };
    const response = await fetch(JIRA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
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

  getClientId(): string {
    return AppConfig.get().JIRA_CLIENT_ID;
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

    if (actionType === 'CREATE_TICKET') {
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

    if (actionType === 'ADD_TICKET_COMMENT') {
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
