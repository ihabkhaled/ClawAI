import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import {
  HEALTH_CHECK_TIMEOUT_MS,
  OAUTH_PROBE_INVALID_CODE,
  OAUTH_PROBE_INVALID_REDIRECT_URI,
  SLACK_API_BASE,
  SLACK_AUTH_URL,
  SLACK_TOKEN_URL,
  WRITE_EXECUTION_TIMEOUT_MS,
} from '../../../common/constants/workspace.constants';
import { OAuthProbeOutcome } from '../enums/oauth-probe-outcome.enum';
import { probeOAuthAppCredentials } from '../utilities/oauth-app-probe.utility';
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
export class SlackAdapter implements WorkspaceAdapter {
  private readonly logger = new Logger(SlackAdapter.name);

  async healthCheck(accessToken: string, _baseUrl?: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${SLACK_API_BASE}/auth.test`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      });
      const latencyMs = Date.now() - start;
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (data['ok']) {
        return { status: WorkspaceConnectorStatus.CONNECTED, latencyMs };
      }
      if (data['error'] === 'invalid_auth' || data['error'] === 'token_revoked') {
        return {
          status: WorkspaceConnectorStatus.DISCONNECTED,
          latencyMs,
          errorMessage: data['error'],
        };
      }
      return { status: WorkspaceConnectorStatus.DEGRADED, latencyMs, errorMessage: data['error'] };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Slack health check failed: ${message}`);
      return {
        status: WorkspaceConnectorStatus.DISCONNECTED,
        latencyMs: Date.now() - start,
        errorMessage: message,
      };
    }
  }

  async syncObjects(accessToken: string, _deltaToken?: string): Promise<SyncResult> {
    const response = await fetch(
      `${SLACK_API_BASE}/conversations.list?limit=200&types=public_channel,private_channel`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const data = (await response.json()) as {
      ok: boolean;
      channels?: Array<{ id: string; name: string; purpose?: { value: string }; created: number }>;
      error?: string;
    };
    if (!data['ok']) {
      throw new Error(`Slack sync failed: ${data['error'] ?? 'unknown'}`);
    }
    const channels = data['channels'] ?? [];
    const objects: SyncedObject[] = channels.map((channel) => ({
      externalId: channel.id,
      type: WorkspaceObjectType.CHANNEL,
      title: `#${channel.name}`,
      content: channel.purpose?.value,
      externalCreatedAt: new Date(channel.created * 1000),
    }));
    return {
      objectsFound: objects.length,
      objectsSynced: objects.length,
      objectsFailed: 0,
      objects,
    };
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    _codeVerifier: string | undefined,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Slack OAuth requires clientId and clientSecret from provider app config');
    }
    const body = new URLSearchParams({
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      code,
      redirect_uri: redirectUri,
    });
    const response = await fetch(SLACK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data = (await response.json()) as {
      ok: boolean;
      access_token?: string;
      authed_user?: { access_token?: string };
      scope?: string;
      error?: string;
    };
    if (!data['ok']) {
      throw new Error(`Slack token exchange failed: ${data['error'] ?? 'unknown'}`);
    }
    const accessToken = data['access_token'] ?? data['authed_user']?.['access_token'] ?? '';
    return { accessToken, scopes: (data['scope'] ?? '').split(',').filter(Boolean) };
  }

  async refreshTokens(
    _refreshToken: string,
    _appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    throw new Error('Slack does not support token refresh via refresh_token flow');
  }

  async validateOAuthAppConfig(appCredentials: AdapterAppCredentials): Promise<HealthCheckResult> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Slack OAuth probe requires clientId and clientSecret');
    }
    const form = new URLSearchParams({
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      code: OAUTH_PROBE_INVALID_CODE,
      redirect_uri: OAUTH_PROBE_INVALID_REDIRECT_URI,
    });
    return probeOAuthAppCredentials({
      tokenUrl: SLACK_TOKEN_URL,
      requestBuilder: () => ({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      }),
      interpret: (payload) => {
        const data = payload as { ok?: boolean; error?: string } | null;
        if (data?.ok === true) {
          return OAuthProbeOutcome.CREDENTIALS_OK;
        }
        const error = data?.error;
        if (
          error === 'invalid_code' ||
          error === 'bad_redirect_uri' ||
          error === 'code_already_used'
        ) {
          return OAuthProbeOutcome.CREDENTIALS_OK;
        }
        if (
          error === 'invalid_client_id' ||
          error === 'bad_client_secret' ||
          error === 'invalid_client_secret'
        ) {
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
      objectTypes: ['CHANNEL', 'MESSAGE', 'USER'],
    };
  }

  getAuthorizationBaseUrl(): string {
    return SLACK_AUTH_URL;
  }

  getDefaultScopes(): string[] {
    return ['channels:read', 'channels:history', 'users:read'];
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

    if (
      actionType === 'SEND_SLACK_MESSAGE' ||
      actionType === 'SEND_SLACK' ||
      actionType === 'REPLY_SLACK'
    ) {
      const postBody: Record<string, unknown> = {
        channel: payload['channel'],
        text: payload['text'],
      };
      if (payload['blocks'] !== undefined) {
        postBody['blocks'] = payload['blocks'];
      }
      if (actionType === 'REPLY_SLACK' && typeof payload['threadTs'] === 'string') {
        postBody['thread_ts'] = payload['threadTs'];
      }
      const response = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal,
        body: JSON.stringify(postBody),
      });
      const data = (await response.json()) as { ok: boolean; ts?: string; error?: string };
      if (!data.ok) {
        return { success: false, errorMessage: `Slack API error: ${data['error'] ?? 'unknown'}` };
      }
      return { success: true, externalId: data['ts'] };
    }

    return { success: false, errorMessage: `Slack adapter: unsupported action type ${actionType}` };
  }
}
