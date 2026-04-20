import { Injectable, Logger } from '@nestjs/common';

import {
  GMAIL_API_BASE,
  GMAIL_SYNC_MESSAGE_LIMIT,
  GMAIL_USER_ENDPOINT,
  GOOGLE_AUTH_URL,
  GOOGLE_TOKEN_URL,
  HEALTH_CHECK_TIMEOUT_MS,
} from '../../../common/constants/workspace.constants';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import type { AdapterAppCredentials, WorkspaceAdapter } from './workspace-adapter.interface';
import type {
  GmailHeader,
  GmailMessage,
  GmailMessageListResponse,
  GoogleTokenResponse,
} from '../types/gmail-api.types';
import type {
  AdapterCapabilities,
  HealthCheckResult,
  LiveObjectDetails,
  OAuthTokenSet,
  SyncedObject,
  SyncResult,
} from '../types/workspace.types';

@Injectable()
export class GmailAdapter implements WorkspaceAdapter {
  private readonly logger = new Logger(GmailAdapter.name);

  async healthCheck(accessToken: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${GMAIL_API_BASE}/users/${GMAIL_USER_ENDPOINT}/profile`, {
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
      this.logger.warn(`Gmail health check failed: ${message}`);
      return {
        status: WorkspaceConnectorStatus.DISCONNECTED,
        latencyMs: Date.now() - start,
        errorMessage: message,
      };
    }
  }

  async syncObjects(accessToken: string, _deltaToken?: string): Promise<SyncResult> {
    const list = await this.listRecentMessages(accessToken);
    const objects: SyncedObject[] = [];
    for (const ref of list.slice(0, GMAIL_SYNC_MESSAGE_LIMIT)) {
      try {
        const full = await this.fetchMessage(accessToken, ref.id);
        objects.push(this.mapMessageToSynced(full));
      } catch (error) {
        this.logger.warn(`Gmail message fetch failed id=${ref.id}: ${String(error)}`);
      }
    }
    return {
      objectsFound: list.length,
      objectsSynced: objects.length,
      objectsFailed: list.length - objects.length,
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
      throw new Error('Gmail OAuth requires clientId and clientSecret');
    }
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      code,
      redirect_uri: redirectUri,
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    });
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(`Gmail token exchange failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as GoogleTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  async refreshTokens(
    refreshToken: string,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Gmail refresh requires clientId and clientSecret');
    }
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      refresh_token: refreshToken,
    });
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(`Gmail token refresh failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as GoogleTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  getCapabilities(): AdapterCapabilities {
    return {
      supportsOAuth: true,
      supportsPat: false,
      supportsDeltaSync: false,
      supportsWebhooks: false,
      objectTypes: ['EMAIL'],
    };
  }

  getAuthorizationBaseUrl(): string {
    return GOOGLE_AUTH_URL;
  }

  getDefaultScopes(): string[] {
    return [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.metadata',
    ];
  }

  async fetchObjectDetails(
    accessToken: string,
    externalId: string,
    objectType: string,
  ): Promise<LiveObjectDetails | null> {
    if (objectType !== WorkspaceObjectType.EMAIL) {
      return null;
    }
    try {
      const full = await this.fetchMessage(accessToken, externalId);
      return this.mapMessageToLive(full);
    } catch (error) {
      if ((error as { status?: number } | null)?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  private normalizeTokenResponse(data: GoogleTokenResponse): OAuthTokenSet {
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

  private async listRecentMessages(
    accessToken: string,
  ): Promise<Array<{ id: string; threadId: string }>> {
    const response = await fetch(
      `${GMAIL_API_BASE}/users/${GMAIL_USER_ENDPOINT}/messages?maxResults=${String(GMAIL_SYNC_MESSAGE_LIMIT)}&q=newer_than:30d`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
    );
    if (!response.ok) {
      throw new Error(`Gmail list failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as GmailMessageListResponse;
    return data.messages ?? [];
  }

  private async fetchMessage(accessToken: string, id: string): Promise<GmailMessage> {
    const response = await fetch(
      `${GMAIL_API_BASE}/users/${GMAIL_USER_ENDPOINT}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
    );
    if (!response.ok) {
      const err = new Error(`Gmail get failed: HTTP ${response.status}`) as Error & {
        status: number;
      };
      err.status = response.status;
      throw err;
    }
    return (await response.json()) as GmailMessage;
  }

  private header(headers: GmailHeader[] | undefined, name: string): string | undefined {
    return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
  }

  private mapMessageToSynced(message: GmailMessage): SyncedObject {
    const headers = message.payload?.headers;
    const subject = this.header(headers, 'Subject') ?? '(no subject)';
    const from = this.header(headers, 'From');
    const to = this.header(headers, 'To');
    const internal = message.internalDate ? new Date(Number(message.internalDate)) : undefined;
    return {
      externalId: message.id,
      type: WorkspaceObjectType.EMAIL,
      title: subject,
      content: message.snippet,
      url: `https://mail.google.com/mail/u/0/#inbox/${message.threadId}`,
      authorId: from,
      metadata: {
        threadId: message.threadId,
        labelIds: message.labelIds,
        from,
        to,
      },
      externalCreatedAt: internal,
      externalUpdatedAt: internal,
    };
  }

  private mapMessageToLive(message: GmailMessage): LiveObjectDetails {
    const headers = message.payload?.headers;
    const subject = this.header(headers, 'Subject') ?? '(no subject)';
    const from = this.header(headers, 'From');
    const to = this.header(headers, 'To');
    const internal = message.internalDate ? new Date(Number(message.internalDate)) : null;
    return {
      externalId: message.id,
      title: subject,
      content: message.snippet ?? null,
      url: `https://mail.google.com/mail/u/0/#inbox/${message.threadId}`,
      authorId: from ?? null,
      externalCreatedAt: internal,
      externalUpdatedAt: internal,
      metadata: {
        threadId: message.threadId,
        labelIds: message.labelIds,
        from,
        to,
      },
    };
  }
}
