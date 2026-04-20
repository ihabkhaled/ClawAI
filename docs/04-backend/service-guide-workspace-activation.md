# Workspace Activation & Refactor (2026-04-20 → 2026-04-21)

This document covers the workspace UX + service refactor that ships
across commits `373662a` → latest. The goal was to convert `/workspace`
from a "management console with dead-ends" into a post-connect
activation hub, with real backend guardrails behind it.

## What changed, phase by phase

### Phase 0 — Guardrails (`373662a`)

- `POST /api/v1/workspace/connectors` now rejects OAuth providers that
  don't supply an `accessToken`, with HTTP `400` and code
  `OAUTH_PROVIDER_REQUIRES_OAUTH_FLOW` (enum value
  `WorkspaceErrorCode.OAUTH_REQUIRED`). This closes the path that used
  to produce broken credential-less connector rows.
- Frontend: the "New Connector" dialog is removed from the `/workspace`
  home page. The primary CTA now routes to `/workspace/app-configs`,
  which is the real OAuth entry point.
- New `WorkspaceErrorCode` enum centralizes the taxonomy for every
  future throw in this service (`CONFIG_*`, `OAUTH_*`, `CONNECTOR_*`,
  `SYNC_*`, `PROVIDER_*`, `ACTION_*`, `SECURITY_*`).

### Phase 1 — Connector detail + IA cleanup

- New route `GET /workspace/connectors/[connectorId]` rendered by a
  `ConnectorDetailView` that aggregates, per connector:
  - Status + aggregate counts
  - Recent synced objects (top 10 of 20 fetched)
  - Sync history (last 20 runs)
  - Health history (last 20 events)
- The detail page uses four existing backend endpoints in parallel
  through TanStack Query — no new aggregation endpoint was needed:
  - `GET /workspace/connectors/:id`
  - `GET /workspace/connectors/:id/sync-runs?limit=20`
  - `GET /workspace/connectors/:id/health-events?limit=20`
  - `GET /workspace/objects?connectorId=:id&limit=20`
- `/workspace/providers` dropped from the sidebar. The page still
  exists on its route for admins; it just no longer occupies a nav
  slot because the audit flagged it as a read-only dead-end.
- Connector cards on `/workspace` link to the new detail page via the
  card title.

### Phase 2 — Auto-sync on connect

- New `ConnectorActivationManager` subscribes to
  `WORKSPACE_CONNECTOR_CREATED` via `RabbitMQService.subscribe(...)` in
  its `onModuleInit`. When a new connector has encrypted tokens
  (i.e. came from the OAuth callback), it enqueues a first sync via
  `WorkspaceSyncManager.syncConnector(connector, false)`.
- The first sync runs fire-and-forget. Failures persist as a
  `WorkspaceSyncRun` with `status=FAILED` and the adapter's error
  message, so the UI always has something to render.
- Registered in `WorkspaceModule` providers. Covered by
  `connector-activation.manager.spec.ts` — 6 unit tests: wiring,
  malformed payload, missing connector, PENDING_AUTH skip, happy path,
  error swallow.
- Frontend: the OAuth callback page now redirects to
  `/workspace/connectors/[id]` instead of `/workspace`. The detail
  page IS the activation view. While the latest sync run is `RUNNING`
  or `PENDING`, the detail hook polls the connector, sync-runs, and
  objects queries every 2 s. Polling stops automatically when the run
  transitions to `COMPLETED` / `FAILED` (per the no-infinite-polling
  rule). A banner explains what is happening.

### Phase 3 — Connector → chat handoff

- Detail page gains an **Ask AI about this** primary-action button
  that creates a fresh chat thread seeded with a connector-scoped
  system prompt (provider name + connector id + "answer based on the
  synced objects for this connector") and a titled like
  `About <connectorName>`.
- No backend changes: the existing `POST /chat-threads` endpoint
  accepts `title` and `systemPrompt`.
- New utility `workspace-chat-handoff.utility.ts` exposes
  `buildConnectorSystemPrompt` (used) and `buildObjectSystemPrompt`
  (reserved for object-level handoff).

### Phase 4 — Actions queue clarity

- `/workspace/actions` now shows a collapsible payload preview for
  each action row. Clicking *View payload* reveals pretty-printed JSON
  of what will actually execute, with sensitive keys
  (`token`, `secret`, `password`, `apiKey` / `api_key`, `bearer`,
  `authorization`, any nesting depth) replaced with `[REDACTED]`.
- Previews are truncated at 2000 chars with a marker.
- Provenance line expanded: `requested … · reviewed … · executed …`
  with the last two only rendered when the action has actually
  transitioned.
- New utility `workspace-action-payload.utility.ts` with 5 unit tests
  (empty, simple, key-name redaction, nested/array redaction,
  truncation).

### Phase 5 — Hardening

- Manual-create endpoint still works for admin/test paths (OAuth gate
  keeps enforcing the real contract), but now emits a `WARN` log on
  every call marking it `DEPRECATED` and pointing at the
  `/workspace/oauth/init → /workspace/oauth/callback` flow. This gives
  us an observable migration signal before the endpoint is removed.
- Detail page shows a **Reconnect** banner whenever the connector's
  status is `DISCONNECTED` or `PENDING_AUTH`, with a direct link to
  `/workspace/app-configs`. Replaces the silent "sync does nothing"
  experience with an obvious next action.
- Sync retry/backoff continues to be handled inside
  `WorkspaceSyncManager.executeSyncWithRetry` — no changes needed.

## Events

The workspace domain publishes:

| Event | Publisher | Consumer added in this refactor |
|---|---|---|
| `WORKSPACE_CONNECTOR_CREATED` | `WorkspaceConnectorService` | ✅ `ConnectorActivationManager` (workspace) |
| `WORKSPACE_CONNECTOR_UPDATED` | `WorkspaceConnectorService` | (none) |
| `WORKSPACE_CONNECTOR_DELETED` | `WorkspaceConnectorService` | (none) |
| `WORKSPACE_CONNECTOR_SYNCED` | `WorkspaceSyncManager` | (audit) |
| `WORKSPACE_CONNECTOR_HEALTH_CHECKED` | `WorkspaceHealthManager` | (audit) |

## API error taxonomy

`WorkspaceErrorCode` (see
`apps/claw-workspace-service/src/common/enums/workspace-error-code.enum.ts`):

```
CONFIG_NOT_FOUND, CONFIG_NOT_READY, CONFIG_INVALID, CONFIG_PROVIDER_MISMATCH
OAUTH_NOT_SUPPORTED, OAUTH_INVALID_STATE, OAUTH_PROVIDER_REQUIRES_OAUTH_FLOW,
OAUTH_EXCHANGE_FAILED, OAUTH_REFRESH_FAILED
CONNECTOR_NOT_FOUND, CONNECTOR_FORBIDDEN, CONNECTOR_PENDING_AUTH,
CONNECTOR_DISCONNECTED, CONNECTOR_TOKEN_EXPIRED
SYNC_ALREADY_RUNNING, SYNC_NOT_SUPPORTED, SYNC_FAILED
PROVIDER_RATE_LIMITED, PROVIDER_UNAVAILABLE, PROVIDER_UNAUTHORIZED,
PROVIDER_NOT_FOUND, PAT_NOT_SUPPORTED, ADAPTER_NOT_IMPLEMENTED
ACTION_NOT_FOUND, ACTION_INVALID_STATE, ACTION_EXPIRED, ACTION_EXECUTION_FAILED
UNSAFE_BASE_URL, WEBHOOK_SIGNATURE_INVALID, IDEMPOTENCY_KEY_REUSED
```

Callers should switch on `BusinessException.code` rather than message
strings.

## Frontend routes after refactor

| Route | Role |
|---|---|
| `/workspace` | **Connected Workspaces overview** — connector cards, click title → detail |
| `/workspace/connectors/[id]` | **Activation + detail** — aggregates sync runs, health events, recent objects; polls while activating; Ask AI / Sync / Health / Delete actions; reconnect banner when disconnected |
| `/workspace/app-configs` | OAuth app registration + Connect (primary connection entry point) |
| `/workspace/oauth/callback` | System page — exchanges code → redirects to detail page |
| `/workspace/actions` | Write-action approval queue with payload preview + provenance |
| `/workspace/providers` | (not in sidebar) read-only provider catalog |
| `/workspace/search` | (not in sidebar) search synced objects |
| `/workspace/objects/[id]` | (reached from detail page) single object view |

## Post-connect user journey

```
App Configurations
  └─ Create provider app config (clientId + encrypted clientSecret)
  └─ Test credentials (invalid-code probe, works for all 12 adapters)
  └─ Connect → OAuth2 PKCE round trip
         └─ Callback creates WorkspaceConnector(status=CONNECTED)
         └─ WORKSPACE_CONNECTOR_CREATED published
               └─ ConnectorActivationManager auto-enqueues first sync
  └─ Frontend redirects to /workspace/connectors/[id]
         └─ Banner: "Activating… importing your first set of objects"
         └─ Page polls every 2s until sync finishes
         └─ Primary CTA becomes "Ask AI about this"
```

## Known gaps / follow-up

- Object-level chat handoff (`buildObjectSystemPrompt` exists but isn't
  wired into `/workspace/objects/[id]` yet).
- Provider-capability metadata on the detail page (Phase 3 plan
  mentioned "summarize inbox / summarize repo activity" — not built
  yet).
- The manual endpoint is still live; the Phase 5 deprecation is just a
  log warning. Removal will be a future commit once metrics confirm no
  internal callers.
