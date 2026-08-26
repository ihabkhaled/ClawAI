import { Injectable, Logger } from '@nestjs/common';

import {
  CALENDAR_SYNC_LOOKAHEAD_DAYS,
  CALENDAR_SYNC_LOOKBACK_DAYS,
  CALENDAR_SYNC_MAX_EVENTS_PER_TICK,
  GOOGLE_AUTH_URL,
  GOOGLE_CALENDAR_API_BASE,
  GOOGLE_TOKEN_URL,
  HEALTH_CHECK_TIMEOUT_MS,
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
import type { GoogleCalendarEvent, GoogleCalendarEventList } from '../types/calendar-api.types';
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
export class GoogleCalendarAdapter implements WorkspaceAdapter {
  private readonly logger = new Logger(GoogleCalendarAdapter.name);

  async healthCheck(accessToken: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(
        `${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList?maxResults=1`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
        },
      );
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
      this.logger.warn(`Google Calendar health check failed: ${message}`);
      return {
        status: WorkspaceConnectorStatus.DISCONNECTED,
        latencyMs: Date.now() - start,
        errorMessage: message,
      };
    }
  }

  async syncObjects(accessToken: string, deltaToken?: string): Promise<SyncResult> {
    const now = Date.now();
    const timeMin = new Date(now - CALENDAR_SYNC_LOOKBACK_DAYS * 86_400_000).toISOString();
    const timeMax = new Date(now + CALENDAR_SYNC_LOOKAHEAD_DAYS * 86_400_000).toISOString();
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: String(CALENDAR_SYNC_MAX_EVENTS_PER_TICK),
      ...(deltaToken !== undefined ? { syncToken: deltaToken } : {}),
    });
    const response = await fetch(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      },
    );
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Google Calendar sync HTTP ${String(response.status)}: ${text.slice(0, 200)}`,
      );
    }
    const data = (await response.json()) as GoogleCalendarEventList;
    const objects: SyncedObject[] = (data.items ?? [])
      .filter((event) => event.status !== 'cancelled')
      .map((event) => this.mapEventToSynced(event));
    return {
      objectsFound: data.items?.length ?? 0,
      objectsSynced: objects.length,
      objectsFailed: 0,
      deltaTokenOut: data.nextSyncToken ?? data.nextPageToken,
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
      throw new Error('Google Calendar OAuth requires clientId and clientSecret');
    }
    const body: Record<string, string> = {
      code,
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    };
    if (codeVerifier !== undefined) body['code_verifier'] = codeVerifier;
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
    });
    if (!response.ok) {
      throw new Error(await buildOAuthErrorMessage('Google Calendar', 'token exchange', response));
    }
    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt:
        data.expires_in !== undefined ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scopes: (data.scope ?? '').split(' ').filter(Boolean),
    };
  }

  async refreshTokens(
    refreshToken: string,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Google Calendar OAuth refresh requires clientId and clientSecret');
    }
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      refresh_token: refreshToken,
    });
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(await buildOAuthErrorMessage('Google Calendar', 'token refresh', response));
    }
    const data = (await response.json()) as { access_token: string; expires_in?: number };
    return {
      accessToken: data.access_token,
      refreshToken,
      expiresAt:
        data.expires_in !== undefined ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scopes: [],
    };
  }

  async validateOAuthAppConfig(appCredentials: AdapterAppCredentials): Promise<HealthCheckResult> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Google OAuth probe requires clientId and clientSecret');
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
        if (data?.error === 'invalid_grant' || data?.error === 'redirect_uri_mismatch') {
          return OAuthProbeOutcome.CREDENTIALS_OK;
        }
        if (data?.error === 'invalid_client' || status === 401) {
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
      objectTypes: ['MEETING'],
    };
  }

  getAuthorizationBaseUrl(): string {
    return GOOGLE_AUTH_URL;
  }

  getDefaultScopes(): string[] {
    return [
      'https://www.googleapis.com/auth/calendar.readonly',
      // Write-capable, not .readonly — CREATE_GOOGLE_CALENDAR_EVENT needs
      // events.insert, which the readonly scope variant cannot grant.
      'https://www.googleapis.com/auth/calendar.events',
    ];
  }

  getExtraAuthParams(): Record<string, string> {
    return { access_type: 'offline', prompt: 'consent' };
  }

  async fetchObjectDetails(
    accessToken: string,
    externalId: string,
    objectType: string,
  ): Promise<LiveObjectDetails | null> {
    if (objectType !== WorkspaceObjectType.MEETING) return null;
    const response = await fetch(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events/${encodeURIComponent(externalId)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      },
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Google Calendar fetchObjectDetails failed: HTTP ${response.status}`);
    }
    const event = (await response.json()) as GoogleCalendarEvent;
    return {
      externalId: event.id,
      title: event.summary ?? '(no title)',
      content: event.description ?? null,
      url: event.htmlLink ?? null,
      authorId: event.organizer?.email ?? null,
      externalCreatedAt: event.created !== undefined ? new Date(event.created) : null,
      externalUpdatedAt: event.updated !== undefined ? new Date(event.updated) : null,
      metadata: this.buildMetadata(event),
    };
  }

  private mapEventToSynced(event: GoogleCalendarEvent): SyncedObject {
    return {
      externalId: event.id,
      type: WorkspaceObjectType.MEETING,
      title: event.summary ?? '(no title)',
      content: event.description ?? undefined,
      url: event.htmlLink,
      authorId: event.organizer?.email,
      metadata: this.buildMetadata(event),
      externalCreatedAt: event.created !== undefined ? new Date(event.created) : undefined,
      externalUpdatedAt: event.updated !== undefined ? new Date(event.updated) : undefined,
    };
  }

  private buildMetadata(event: GoogleCalendarEvent): Record<string, unknown> {
    return {
      provider: 'GOOGLE_CALENDAR',
      startsAt: event.start?.dateTime ?? event.start?.date,
      endsAt: event.end?.dateTime ?? event.end?.date,
      attendees: (event.attendees ?? []).map((a) => ({
        email: a.email,
        displayName: a.displayName,
        response: a.responseStatus,
      })),
      organizer: event.organizer,
      hangoutLink: event.hangoutLink,
      meetingLinks: (event.conferenceData?.entryPoints ?? []).map((e) => e.uri).filter(Boolean),
    };
  }

  // Post-pack hardening — the one write action this previously read-only
  // provider supports: creating a primary-calendar event via Google
  // Calendar API's standard events.insert endpoint.
  supportsWrite(): boolean {
    return true;
  }

  getSupportedActionTypes(): WorkspaceActionType[] {
    return [WorkspaceActionType.CREATE_GOOGLE_CALENDAR_EVENT];
  }

  async executeWriteAction(
    accessToken: string,
    actionType: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    if (actionType !== WorkspaceActionType.CREATE_GOOGLE_CALENDAR_EVENT) {
      return {
        success: false,
        errorMessage: `Google Calendar adapter: unsupported action type ${actionType}`,
      };
    }
    try {
      const summary = typeof payload['summary'] === 'string' ? payload['summary'] : null;
      const startDateTime =
        typeof payload['startDateTime'] === 'string' ? payload['startDateTime'] : null;
      const endDateTime =
        typeof payload['endDateTime'] === 'string' ? payload['endDateTime'] : null;
      if (summary === null || startDateTime === null || endDateTime === null) {
        return {
          success: false,
          errorMessage:
            'CREATE_GOOGLE_CALENDAR_EVENT requires {summary, startDateTime, endDateTime} in payload',
        };
      }
      const description =
        typeof payload['description'] === 'string' ? payload['description'] : undefined;
      const attendeeEmails = Array.isArray(payload['attendeeEmails'])
        ? (payload['attendeeEmails'] as unknown[]).filter((e): e is string => typeof e === 'string')
        : [];
      const timeZone = typeof payload['timeZone'] === 'string' ? payload['timeZone'] : 'UTC';
      const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary,
          description,
          start: { dateTime: startDateTime, timeZone },
          end: { dateTime: endDateTime, timeZone },
          attendees: attendeeEmails.map((email) => ({ email })),
        }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return {
          success: false,
          errorMessage: `Google Calendar API error: HTTP ${String(response.status)} ${text.slice(0, 200)}`,
        };
      }
      const data = (await response.json()) as GoogleCalendarEvent;
      return { success: true, externalId: data.id, url: data.htmlLink };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`Google Calendar write ${actionType} failed: ${message}`);
      return { success: false, errorMessage: message };
    }
  }
}
