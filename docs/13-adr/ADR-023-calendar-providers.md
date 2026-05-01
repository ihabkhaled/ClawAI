# ADR-023 — Calendar Providers (Google + Outlook)

**Status:** Accepted (2026-05-01)
**Stream:** 23

## Context

Workspace automation needs read-only visibility into the user's calendar so future workstreams (post-meeting summary, action-item extraction) can fire as soon as a meeting ends. The surface needs:

- Mirrored adapter shape per provider — same lifecycle as existing Gmail/Drive.
- New object type `MEETING` distinct from `MEETING_NOTE` (which already exists for transcripts).
- Default-INTERNAL privacy class for calendar-derived suggestions (calendars contain medical, M&A, hiring details).

## Decision

### Enum extensions

`WorkspaceProvider`: add `GOOGLE_CALENDAR`, `OUTLOOK_CALENDAR` (mirrored in shared-types and workspace-service Prisma enum).

`WorkspaceObjectType`: add `MEETING`.

### Two adapters mirror the Gmail/Drive shape

`google-calendar.adapter.ts`:
- API: `https://www.googleapis.com/calendar/v3`
- Sync: `GET /calendars/primary/events?timeMin=…&timeMax=…&singleEvents=true&orderBy=startTime&syncToken=…`
- Window: `[now - 7 days, now + 14 days]` (sliding lookback/lookahead).
- Scopes: `calendar.readonly`, `calendar.events.readonly`.
- Filters out `status=cancelled`.

`outlook-calendar.adapter.ts`:
- API: `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=…&endDateTime=…`
- `Prefer: outlook.timezone="UTC"` so we always normalise on UTC.
- Scopes: `Calendars.Read`, `offline_access`, `User.Read`.

Both adapters implement `WorkspaceAdapter` with `supportsWebhooks: false` — push notifications are deferred to v1.x because Microsoft Graph subscriptions need an HTTPS endpoint with TLS-validated callback URL and Google requires a verified domain.

### Adapter factory + workspace.module

`WorkspaceAdapterFactory.getAdapter()` switch-case extended for the two new providers; `workspace.module.ts` adds both as providers. Sync-cadence default is 600s (calendars don't change as fast as Slack).

## Consequences

- **Read-only in v1**: `getCapabilities().supportsWrite=false`. Creating/modifying calendar events is deferred to a future stream — the read surface is enough for post-meeting summarization.
- **Microsoft Graph delta tokens**: not supported on calendar API yet; we fall back to time-window fetches every cadence tick. Acceptable since calendars usually have <100 events in the rolling window.
- **Privacy default**: `MEETING` objects are default-INTERNAL for the AiActionPolicyMatcher (Stream 10) — the user must explicitly opt in to PUBLIC routing for any calendar-derived action.
- **Out-of-scope for v1**: meeting-notes-scan auto-suggest job (UAT 23.2 / 23.3). The backbone exists — scheduler module + factory — but the wiring of "MEETING ended within 1h AND has attached transcript → SUMMARIZE suggestion" is deferred.

## Verification

- `qa/test-stream-23-calendar.sh` confirms enum members in DB and Docker logs clean.
- Live OAuth flow + sync would require staging credentials — gated behind `STAGING_GOOGLE_CALENDAR_TOKEN` env var.
