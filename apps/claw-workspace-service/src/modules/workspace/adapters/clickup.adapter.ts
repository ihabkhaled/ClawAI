import { Injectable, Logger } from '@nestjs/common';

import {
  CLICKUP_API_BASE,
  CLICKUP_AUTH_URL,
  CLICKUP_SYNC_TASKS_PER_LIST,
  CLICKUP_TOKEN_URL,
  HEALTH_CHECK_TIMEOUT_MS,
} from '../../../common/constants/workspace.constants';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import type { AdapterAppCredentials, WorkspaceAdapter } from './workspace-adapter.interface';
import type {
  ClickUpList,
  ClickUpListsResponse,
  ClickUpSpacesResponse,
  ClickUpTask,
  ClickUpTasksResponse,
  ClickUpTeamsResponse,
  ClickUpTokenResponse,
} from '../types/clickup-api.types';
import type {
  AdapterCapabilities,
  HealthCheckResult,
  LiveObjectDetails,
  OAuthTokenSet,
  SyncedObject,
  SyncResult,
} from '../types/workspace.types';

@Injectable()
export class ClickUpAdapter implements WorkspaceAdapter {
  private readonly logger = new Logger(ClickUpAdapter.name);

  async healthCheck(accessToken: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${CLICKUP_API_BASE}/user`, {
        headers: { Authorization: accessToken, Accept: 'application/json' },
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
      this.logger.warn(`ClickUp health check failed: ${message}`);
      return {
        status: WorkspaceConnectorStatus.DISCONNECTED,
        latencyMs: Date.now() - start,
        errorMessage: message,
      };
    }
  }

  async syncObjects(accessToken: string, _deltaToken?: string): Promise<SyncResult> {
    const teams = await this.listTeams(accessToken);
    const objects: SyncedObject[] = [];
    for (const team of teams) {
      const spaces = await this.safeListSpaces(accessToken, team.id);
      for (const space of spaces) {
        const lists = await this.safeListLists(accessToken, space.id);
        for (const list of lists) {
          const tasks = await this.safeListTasks(accessToken, list.id);
          objects.push(...tasks.map((t) => this.mapTaskToSynced(t, list, team.name)));
        }
      }
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
      throw new Error('ClickUp OAuth requires clientId and clientSecret');
    }
    const body = new URLSearchParams({
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      code,
    });
    const response = await fetch(CLICKUP_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(`ClickUp token exchange failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as ClickUpTokenResponse;
    return {
      accessToken: data.access_token,
      scopes: ['api'],
    };
  }

  async refreshTokens(
    _refreshToken: string,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('ClickUp refresh requires clientId and clientSecret');
    }
    throw new Error('ClickUp tokens do not expire; refresh is not supported');
  }

  getCapabilities(): AdapterCapabilities {
    return {
      supportsOAuth: true,
      supportsPat: false,
      supportsDeltaSync: false,
      supportsWebhooks: true,
      objectTypes: ['TICKET'],
    };
  }

  getAuthorizationBaseUrl(): string {
    return CLICKUP_AUTH_URL;
  }

  getDefaultScopes(): string[] {
    return ['api'];
  }

  async fetchObjectDetails(
    accessToken: string,
    externalId: string,
    objectType: string,
  ): Promise<LiveObjectDetails | null> {
    if (objectType !== WorkspaceObjectType.TICKET) {
      return null;
    }
    const response = await fetch(`${CLICKUP_API_BASE}/task/${externalId}`, {
      headers: { Authorization: accessToken, Accept: 'application/json' },
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`ClickUp fetchObjectDetails failed: HTTP ${response.status}`);
    }
    const task = (await response.json()) as ClickUpTask;
    return {
      externalId: task.id,
      title: task.name,
      content: task.text_content ?? task.description ?? null,
      url: task.url,
      authorId: task.creator?.username ?? null,
      externalCreatedAt: new Date(Number(task.date_created)),
      externalUpdatedAt: new Date(Number(task.date_updated)),
      metadata: {
        status: task.status.status,
        listId: task.list?.id,
        listName: task.list?.name,
      },
    };
  }

  private async listTeams(accessToken: string): Promise<Array<{ id: string; name: string }>> {
    const response = await fetch(`${CLICKUP_API_BASE}/team`, {
      headers: { Authorization: accessToken, Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`ClickUp teams failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as ClickUpTeamsResponse;
    return data.teams;
  }

  private async safeListSpaces(
    accessToken: string,
    teamId: string,
  ): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await fetch(`${CLICKUP_API_BASE}/team/${teamId}/space?archived=false`, {
        headers: { Authorization: accessToken, Accept: 'application/json' },
      });
      if (!response.ok) {
        return [];
      }
      const data = (await response.json()) as ClickUpSpacesResponse;
      return data.spaces;
    } catch {
      return [];
    }
  }

  private async safeListLists(accessToken: string, spaceId: string): Promise<ClickUpList[]> {
    try {
      const response = await fetch(`${CLICKUP_API_BASE}/space/${spaceId}/list?archived=false`, {
        headers: { Authorization: accessToken, Accept: 'application/json' },
      });
      if (!response.ok) {
        return [];
      }
      const data = (await response.json()) as ClickUpListsResponse;
      return data.lists;
    } catch {
      return [];
    }
  }

  private async safeListTasks(accessToken: string, listId: string): Promise<ClickUpTask[]> {
    try {
      const response = await fetch(
        `${CLICKUP_API_BASE}/list/${listId}/task?page=0&archived=false&order_by=updated&reverse=true`,
        { headers: { Authorization: accessToken, Accept: 'application/json' } },
      );
      if (!response.ok) {
        this.logger.warn(`ClickUp tasks fetch failed for list ${listId}: HTTP ${response.status}`);
        return [];
      }
      const data = (await response.json()) as ClickUpTasksResponse;
      return data.tasks.slice(0, CLICKUP_SYNC_TASKS_PER_LIST);
    } catch (error) {
      this.logger.warn(`ClickUp tasks error list=${listId}: ${String(error)}`);
      return [];
    }
  }

  private mapTaskToSynced(task: ClickUpTask, list: ClickUpList, teamName: string): SyncedObject {
    return {
      externalId: task.id,
      type: WorkspaceObjectType.TICKET,
      title: task.name,
      content: task.text_content ?? task.description ?? undefined,
      url: task.url,
      authorId: task.creator?.username,
      metadata: {
        status: task.status.status,
        listId: list.id,
        listName: list.name,
        teamName,
      },
      externalCreatedAt: new Date(Number(task.date_created)),
      externalUpdatedAt: new Date(Number(task.date_updated)),
    };
  }
}
