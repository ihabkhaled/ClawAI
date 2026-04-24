import { Injectable, Logger } from '@nestjs/common';

import {
  GMAIL_API_BASE,
  GMAIL_SYNC_MESSAGE_LIMIT,
  GMAIL_USER_ENDPOINT,
  GOOGLE_AUTH_URL,
  GOOGLE_TOKEN_URL,
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
  WriteActionResult,
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

  async syncObjects(accessToken: string, deltaToken?: string): Promise<SyncResult> {
    if (deltaToken !== undefined && deltaToken.length > 0) {
      const deltaResult = await this.syncObjectsWithHistory(accessToken, deltaToken);
      if (deltaResult !== null) {
        return deltaResult;
      }
      this.logger.warn('Gmail historyId stale or invalid — falling back to full list');
    }
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
    const newHistoryId = await this.fetchCurrentHistoryId(accessToken);
    return {
      objectsFound: list.length,
      objectsSynced: objects.length,
      objectsFailed: list.length - objects.length,
      deltaTokenOut: newHistoryId ?? new Date().toISOString(),
      objects,
    };
  }

  /**
   * Delta-mode sync using Gmail `users.history.list?startHistoryId=<last>`.
   * Returns null to signal "cursor invalid, caller must fall back to full poll".
   */
  private async syncObjectsWithHistory(
    accessToken: string,
    startHistoryId: string,
  ): Promise<SyncResult | null> {
    try {
      const response = await fetch(
        `${GMAIL_API_BASE}/users/${GMAIL_USER_ENDPOINT}/history?startHistoryId=${encodeURIComponent(startHistoryId)}&historyTypes=messageAdded&historyTypes=labelAdded`,
        { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
      );
      if (response.status === 404 || response.status === 410) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Gmail history failed: HTTP ${response.status}`);
      }
      const data = (await response.json()) as {
        history?: Array<{
          id: string;
          messagesAdded?: Array<{ message: { id: string; threadId: string } }>;
          messages?: Array<{ id: string; threadId: string }>;
        }>;
        historyId?: string;
      };

      const messageIds = new Set<string>();
      for (const entry of data.history ?? []) {
        for (const added of entry.messagesAdded ?? []) {
          messageIds.add(added.message.id);
        }
        for (const msg of entry.messages ?? []) {
          messageIds.add(msg.id);
        }
      }

      const ids = [...messageIds].slice(0, GMAIL_SYNC_MESSAGE_LIMIT);
      const objects: SyncedObject[] = [];
      for (const id of ids) {
        try {
          const full = await this.fetchMessage(accessToken, id);
          objects.push(this.mapMessageToSynced(full));
        } catch (error) {
          this.logger.warn(`Gmail history fetch failed id=${id}: ${String(error)}`);
        }
      }

      return {
        objectsFound: ids.length,
        objectsSynced: objects.length,
        objectsFailed: ids.length - objects.length,
        deltaTokenOut: data.historyId ?? startHistoryId,
        objects,
      };
    } catch (error) {
      this.logger.warn(`Gmail history delta failed: ${String(error)}`);
      return null;
    }
  }

  private async fetchCurrentHistoryId(accessToken: string): Promise<string | undefined> {
    try {
      const response = await fetch(`${GMAIL_API_BASE}/users/${GMAIL_USER_ENDPOINT}/profile`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      });
      if (!response.ok) {
        return undefined;
      }
      const data = (await response.json()) as { historyId?: string };
      return data.historyId;
    } catch {
      return undefined;
    }
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
      throw new Error(await buildOAuthErrorMessage('Gmail', 'token exchange', response));
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
      throw new Error(await buildOAuthErrorMessage('Gmail', 'token refresh', response));
    }
    const data = (await response.json()) as GoogleTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  async validateOAuthAppConfig(appCredentials: AdapterAppCredentials): Promise<HealthCheckResult> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Gmail OAuth probe requires clientId and clientSecret');
    }
    const form = new URLSearchParams({
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      grant_type: 'authorization_code',
      code: OAUTH_PROBE_INVALID_CODE,
      redirect_uri: OAUTH_PROBE_INVALID_REDIRECT_URI,
    });
    return probeOAuthAppCredentials({
      tokenUrl: GOOGLE_TOKEN_URL,
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
        if (error === 'invalid_grant' || error === 'redirect_uri_mismatch') {
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
      supportsPat: false,
      supportsDeltaSync: true,
      supportsWebhooks: false,
      objectTypes: ['EMAIL'],
    };
  }

  getAuthorizationBaseUrl(): string {
    return GOOGLE_AUTH_URL;
  }

  getDefaultScopes(): string[] {
    // NOTE: do NOT request gmail.metadata alongside gmail.readonly.
    // Gmail applies the most restrictive scope to any given request, and
    // messages.list with `q=` search queries is forbidden under
    // gmail.metadata (which only allows header-level access). Granting
    // both scopes causes 403 on message list.
    return [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
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
    // NOTE: intentionally NOT using `q=newer_than:30d` — that query is
    // forbidden under gmail.metadata scope (returns 403). Use labelIds
    // instead, which works under both metadata and readonly.
    const response = await fetch(
      `${GMAIL_API_BASE}/users/${GMAIL_USER_ENDPOINT}/messages?maxResults=${String(GMAIL_SYNC_MESSAGE_LIMIT)}&labelIds=INBOX`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
    );
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Gmail list failed: HTTP ${response.status}${body ? ` — ${body.slice(0, 200)}` : ''}`,
      );
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

  supportsWrite(): boolean {
    return true;
  }

  async executeWriteAction(
    accessToken: string,
    actionType: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    if (actionType === 'SEND_EMAIL' || actionType === 'REPLY_EMAIL') {
      return this.sendEmail(accessToken, payload, actionType === 'REPLY_EMAIL');
    }
    return {
      success: false,
      errorMessage: `Gmail adapter: unsupported action type ${actionType}`,
    };
  }

  private async sendEmail(
    accessToken: string,
    payload: Record<string, unknown>,
    isReply: boolean,
  ): Promise<WriteActionResult> {
    const to = typeof payload['to'] === 'string' ? payload['to'] : null;
    const subject = typeof payload['subject'] === 'string' ? payload['subject'] : null;
    const body = typeof payload['body'] === 'string' ? payload['body'] : null;
    const threadId =
      isReply && typeof payload['threadId'] === 'string' ? payload['threadId'] : undefined;
    if (to === null || subject === null || body === null) {
      return {
        success: false,
        errorMessage: 'Gmail send requires {to, subject, body} fields in payload',
      };
    }

    const rfc822 = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      body,
    ].join('\r\n');
    const raw = Buffer.from(rfc822, 'utf-8').toString('base64url');

    const response = await fetch(`${GMAIL_API_BASE}/users/${GMAIL_USER_ENDPOINT}/messages/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw, ...(threadId !== undefined ? { threadId } : {}) }),
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        success: false,
        errorMessage: `Gmail send failed: HTTP ${response.status} ${errorText.slice(0, 200)}`,
      };
    }
    const data = (await response.json()) as { id?: string; threadId?: string };
    return {
      success: true,
      externalId: data.id,
      url:
        data.threadId !== undefined
          ? `https://mail.google.com/mail/u/0/#inbox/${data.threadId}`
          : undefined,
      metadata: { threadId: data.threadId },
    };
  }
}
