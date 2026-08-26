import { Injectable, Logger } from '@nestjs/common';

import {
  CALENDAR_SYNC_LOOKAHEAD_DAYS,
  CALENDAR_SYNC_LOOKBACK_DAYS,
  CALENDAR_SYNC_MAX_EVENTS_PER_TICK,
  HEALTH_CHECK_TIMEOUT_MS,
  MICROSOFT_AUTH_URL,
  MICROSOFT_GRAPH_API_BASE,
  MICROSOFT_TOKEN_URL,
  OAUTH_PROBE_INVALID_CODE,
  OAUTH_PROBE_INVALID_REDIRECT_URI,
} from '../../../common/constants/workspace.constants';
import { OAuthProbeOutcome } from '../enums/oauth-probe-outcome.enum';
import { probeOAuthAppCredentials } from '../utilities/oauth-app-probe.utility';
import { buildOAuthErrorMessage } from '../utilities/oauth-error.utility';
import { WorkspaceActionType } from '../../../common/enums/workspace-action-type.enum';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import type { AdapterAppCredentials, WorkspaceAdapter } from './workspace-adapter.interface';
import type { OutlookCalendarEvent, OutlookCalendarEventList } from '../types/calendar-api.types';
import type { MicrosoftTokenResponse } from '../types/microsoft-graph.types';
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
export class OutlookCalendarAdapter implements WorkspaceAdapter {
  private readonly logger = new Logger(OutlookCalendarAdapter.name);

  async healthCheck(accessToken: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${MICROSOFT_GRAPH_API_BASE}/me/calendar`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      });
      const latencyMs = Date.now() - start;
      if (response.ok) return { status: WorkspaceConnectorStatus.CONNECTED, latencyMs };
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
      this.logger.warn(`Outlook Calendar health check failed: ${message}`);
      return {
        status: WorkspaceConnectorStatus.DISCONNECTED,
        latencyMs: Date.now() - start,
        errorMessage: message,
      };
    }
  }

  async syncObjects(accessToken: string, _deltaToken?: string): Promise<SyncResult> {
    const now = Date.now();
    const startISO = new Date(now - CALENDAR_SYNC_LOOKBACK_DAYS * 86_400_000).toISOString();
    const endISO = new Date(now + CALENDAR_SYNC_LOOKAHEAD_DAYS * 86_400_000).toISOString();
    const url =
      `${MICROSOFT_GRAPH_API_BASE}/me/calendarView?` +
      `startDateTime=${encodeURIComponent(startISO)}&endDateTime=${encodeURIComponent(endISO)}&` +
      `$top=${String(CALENDAR_SYNC_MAX_EVENTS_PER_TICK)}&$orderby=start/dateTime`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        Prefer: 'outlook.timezone="UTC"',
      },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Outlook Calendar sync HTTP ${String(response.status)}: ${text.slice(0, 200)}`,
      );
    }
    const data = (await response.json()) as OutlookCalendarEventList;
    const objects: SyncedObject[] = (data.value ?? [])
      .filter((event) => event.isCancelled !== true)
      .map((event) => this.mapEventToSynced(event));
    return {
      objectsFound: data.value?.length ?? 0,
      objectsSynced: objects.length,
      objectsFailed: 0,
      deltaTokenOut: data['@odata.nextLink'],
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
      throw new Error('Outlook Calendar OAuth requires clientId and clientSecret');
    }
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      code,
      redirect_uri: redirectUri,
      ...(codeVerifier !== undefined ? { code_verifier: codeVerifier } : {}),
    });
    const response = await fetch(MICROSOFT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(await buildOAuthErrorMessage('Outlook Calendar', 'token exchange', response));
    }
    const data = (await response.json()) as MicrosoftTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  async refreshTokens(
    refreshToken: string,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Outlook Calendar refresh requires clientId and clientSecret');
    }
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      refresh_token: refreshToken,
    });
    const response = await fetch(MICROSOFT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(await buildOAuthErrorMessage('Outlook Calendar', 'token refresh', response));
    }
    const data = (await response.json()) as MicrosoftTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  async validateOAuthAppConfig(appCredentials: AdapterAppCredentials): Promise<HealthCheckResult> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Microsoft OAuth probe requires clientId and clientSecret');
    }
    const tokenUrl = appCredentials.tenantId
      ? MICROSOFT_TOKEN_URL.replace('/common/', `/${appCredentials.tenantId}/`)
      : MICROSOFT_TOKEN_URL;
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
        const data = payload as { error?: string; error_description?: string } | null;
        const error = data?.error;
        const description = data?.error_description ?? '';
        if (
          error === 'invalid_grant' ||
          /AADSTS70008|AADSTS54005|AADSTS9002313/.test(description)
        ) {
          return OAuthProbeOutcome.CREDENTIALS_OK;
        }
        if (
          error === 'invalid_client' ||
          /AADSTS7000215|AADSTS700016/.test(description) ||
          status === 401
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
      supportsWebhooks: false,
      objectTypes: ['MEETING'],
    };
  }

  getAuthorizationBaseUrl(): string {
    return MICROSOFT_AUTH_URL;
  }

  getDefaultScopes(): string[] {
    // Write-capable, not Calendars.Read — CREATE_OUTLOOK_CALENDAR_EVENT
    // needs Calendars.ReadWrite; the read-only scope cannot grant it.
    return ['Calendars.ReadWrite', 'offline_access', 'User.Read'];
  }

  async fetchObjectDetails(
    accessToken: string,
    externalId: string,
    objectType: string,
  ): Promise<LiveObjectDetails | null> {
    if (objectType !== WorkspaceObjectType.MEETING) return null;
    const response = await fetch(
      `${MICROSOFT_GRAPH_API_BASE}/me/events/${encodeURIComponent(externalId)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      },
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Outlook Calendar fetchObjectDetails failed: HTTP ${response.status}`);
    }
    const event = (await response.json()) as OutlookCalendarEvent;
    return {
      externalId: event.id,
      title: event.subject ?? '(no title)',
      content: event.bodyPreview ?? null,
      url: event.webLink ?? null,
      authorId: event.organizer?.emailAddress?.address ?? null,
      externalCreatedAt:
        event.createdDateTime !== undefined ? new Date(event.createdDateTime) : null,
      externalUpdatedAt:
        event.lastModifiedDateTime !== undefined ? new Date(event.lastModifiedDateTime) : null,
      metadata: this.buildMetadata(event),
    };
  }

  private mapEventToSynced(event: OutlookCalendarEvent): SyncedObject {
    return {
      externalId: event.id,
      type: WorkspaceObjectType.MEETING,
      title: event.subject ?? '(no title)',
      content: event.bodyPreview ?? undefined,
      url: event.webLink,
      authorId: event.organizer?.emailAddress?.address,
      metadata: this.buildMetadata(event),
      externalCreatedAt:
        event.createdDateTime !== undefined ? new Date(event.createdDateTime) : undefined,
      externalUpdatedAt:
        event.lastModifiedDateTime !== undefined ? new Date(event.lastModifiedDateTime) : undefined,
    };
  }

  private buildMetadata(event: OutlookCalendarEvent): Record<string, unknown> {
    return {
      provider: 'OUTLOOK_CALENDAR',
      startsAt: event.start?.dateTime,
      endsAt: event.end?.dateTime,
      timezone: event.start?.timeZone,
      attendees: (event.attendees ?? []).map((a) => ({
        email: a.emailAddress?.address,
        displayName: a.emailAddress?.name,
        type: a.type,
        response: a.status?.response,
      })),
      organizer: event.organizer?.emailAddress,
      onlineMeetingUrl: event.onlineMeeting?.joinUrl,
    };
  }

  private normalizeTokenResponse(data: MicrosoftTokenResponse): OAuthTokenSet {
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

  // Post-pack hardening — the one write action this previously read-only
  // provider supports: creating an event via Microsoft Graph's standard
  // POST /me/events endpoint.
  supportsWrite(): boolean {
    return true;
  }

  getSupportedActionTypes(): WorkspaceActionType[] {
    return [WorkspaceActionType.CREATE_OUTLOOK_CALENDAR_EVENT];
  }

  async executeWriteAction(
    accessToken: string,
    actionType: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    if (actionType !== WorkspaceActionType.CREATE_OUTLOOK_CALENDAR_EVENT) {
      return {
        success: false,
        errorMessage: `Outlook Calendar adapter: unsupported action type ${actionType}`,
      };
    }
    try {
      const subject = typeof payload['subject'] === 'string' ? payload['subject'] : null;
      const startDateTime =
        typeof payload['startDateTime'] === 'string' ? payload['startDateTime'] : null;
      const endDateTime =
        typeof payload['endDateTime'] === 'string' ? payload['endDateTime'] : null;
      if (subject === null || startDateTime === null || endDateTime === null) {
        return {
          success: false,
          errorMessage:
            'CREATE_OUTLOOK_CALENDAR_EVENT requires {subject, startDateTime, endDateTime} in payload',
        };
      }
      const body = typeof payload['body'] === 'string' ? payload['body'] : undefined;
      const attendeeEmails = Array.isArray(payload['attendeeEmails'])
        ? (payload['attendeeEmails'] as unknown[]).filter((e): e is string => typeof e === 'string')
        : [];
      const timeZone = typeof payload['timeZone'] === 'string' ? payload['timeZone'] : 'UTC';
      const response = await fetch(`${MICROSOFT_GRAPH_API_BASE}/me/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          subject,
          ...(body !== undefined ? { body: { contentType: 'text', content: body } } : {}),
          start: { dateTime: startDateTime, timeZone },
          end: { dateTime: endDateTime, timeZone },
          attendees: attendeeEmails.map((email) => ({
            emailAddress: { address: email },
            type: 'required',
          })),
        }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return {
          success: false,
          errorMessage: `Outlook Calendar API error: HTTP ${String(response.status)} ${text.slice(0, 200)}`,
        };
      }
      const data = (await response.json()) as OutlookCalendarEvent;
      return { success: true, externalId: data.id, url: data.webLink };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`Outlook Calendar write ${actionType} failed: ${message}`);
      return { success: false, errorMessage: message };
    }
  }
}
