# Service Guide: claw-workspace-service

## Overview

| Property             | Value                          |
| -------------------- | ------------------------------ |
| Port                 | 4014                           |
| Database             | PostgreSQL `claw_workspace`    |
| ORM                  | Prisma 5.x                     |
| Env prefix           | `WORKSPACE_`                   |
| Public route space   | `/api/v1/workspace/*`          |
| Internal route space | `/api/v1/internal/workspace/*` |

The workspace service is Claw's integration layer for external tools and knowledge systems. It manages workspace connectors, OAuth flows, connector health and sync runs, searchable synced objects, and approval-style workspace actions. Chat uses it during context assembly to pull relevant external citations.

---

## Supported Providers

- GitHub
- GitLab
- Bitbucket
- Slack
- Jira
- Confluence
- Figma
- ClickUp
- Google Drive
- Gmail
- Microsoft SharePoint
- Microsoft OneDrive

---

## Core Responsibilities

1. create and manage workspace connectors per user
2. initialize and complete OAuth flows
3. test connector health
4. trigger full or delta syncs
5. store searchable workspace objects
6. expose user-facing search and internal chat search
7. manage action drafts that require user approval

---

## Key Data Models

### `WorkspaceConnector`

Stores one provider connection for one user, including status, scopes, encrypted tokens, permission level, last sync time, and provider metadata.

### `WorkspaceSyncRun`

Tracks sync activity per connector, including object type, delta/full mode, totals, and failure details.

### `WorkspaceHealthEvent`

Persists connector health checks with latency and error details.

### `WorkspaceObject`

Stores synced external objects such as repositories, issues, pull requests, documents, files, comments, channels, emails, and project artifacts.

### `WorkspaceAction`

Represents an action draft such as creating an issue, comment, ticket, or Slack message. Actions move through approval and execution states.

### `WorkspaceObjectLink`

Stores graph-style relationships between synced workspace objects.

---

## API Surface

### Connectors

| Method   | Path                                      | Purpose                           |
| -------- | ----------------------------------------- | --------------------------------- |
| `POST`   | `/api/v1/workspace/connectors`            | Create connector                  |
| `GET`    | `/api/v1/workspace/connectors`            | List connectors                   |
| `GET`    | `/api/v1/workspace/connectors/:id`        | Get connector                     |
| `PATCH`  | `/api/v1/workspace/connectors/:id`        | Update connector                  |
| `DELETE` | `/api/v1/workspace/connectors/:id`        | Delete connector                  |
| `POST`   | `/api/v1/workspace/connectors/:id/health` | Run health check                  |
| `POST`   | `/api/v1/workspace/connectors/:id/sync`   | Trigger sync, optional delta mode |

### OAuth

| Method | Path                               | Purpose                 |
| ------ | ---------------------------------- | ----------------------- |
| `POST` | `/api/v1/workspace/oauth/init`     | Start OAuth/PKCE flow   |
| `GET`  | `/api/v1/workspace/oauth/callback` | Complete OAuth callback |

### Search and objects

| Method | Path                                | Purpose                                   |
| ------ | ----------------------------------- | ----------------------------------------- |
| `POST` | `/api/v1/workspace/search`          | Search synced objects for current user    |
| `GET`  | `/api/v1/workspace/objects`         | List synced objects                       |
| `GET`  | `/api/v1/workspace/objects/:id`     | Get object details                        |
| `POST` | `/api/v1/internal/workspace/search` | Internal search for chat context assembly |

### Actions

| Method | Path                                    | Purpose             |
| ------ | --------------------------------------- | ------------------- |
| `POST` | `/api/v1/workspace/actions`             | Create action draft |
| `GET`  | `/api/v1/workspace/actions`             | List actions        |
| `GET`  | `/api/v1/workspace/actions/:id`         | Get action          |
| `POST` | `/api/v1/workspace/actions/:id/approve` | Approve action      |
| `POST` | `/api/v1/workspace/actions/:id/reject`  | Reject action       |

### AI action policies (admin)

The approval engine routes every draft through a `priority`-ordered chain of
policies. System-defaults seed on boot and cannot be deleted via REST.

| Method   | Path                                       | Purpose                                                                 |
| -------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| `GET`    | `/api/v1/workspace/ai-actions/policies`    | List policies (ordered by `priority` DESC, then `name` ASC)             |
| `GET`    | `/api/v1/workspace/ai-actions/policies/:id`| Get one policy — `404 POLICY_NOT_FOUND` when missing                    |
| `POST`   | `/api/v1/workspace/ai-actions/policies`    | Create policy — `409 POLICY_NAME_TAKEN` on duplicate `name`             |
| `PATCH`  | `/api/v1/workspace/ai-actions/policies/:id`| Partial update (the `name` field is omitted)                            |
| `DELETE` | `/api/v1/workspace/ai-actions/policies/:id`| Delete — `409 POLICY_SYSTEM_DEFAULT_PROTECTED` on system defaults       |

Auth: `GET` requires `ADMIN` or `OPERATOR`; mutations require `ADMIN`.

### Suggestion trigger rules (admin)

| Method   | Path                                       | Purpose                                                                |
| -------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| `GET`    | `/api/v1/workspace/suggestion-rules`       | List rules (ordered by `priority` DESC, then `name` ASC)               |
| `POST`   | `/api/v1/workspace/suggestion-rules`       | Create rule — `409 RULE_NAME_TAKEN` on duplicate `name`                |
| `PATCH`  | `/api/v1/workspace/suggestion-rules/:id`   | Partial update — `404 RULE_NOT_FOUND` when missing                     |
| `DELETE` | `/api/v1/workspace/suggestion-rules/:id`   | Delete — `404 RULE_NOT_FOUND` if missing, `409 RULE_SYSTEM_DEFAULT_PROTECTED` for system defaults |

Auth: `GET` requires `ADMIN` or `OPERATOR`; mutations require `ADMIN`.

### Webhook deliveries (admin)

| Method | Path                                                    | Purpose                                                                                          |
| ------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `GET`  | `/api/v1/workspace/webhooks/deliveries`                 | List deliveries. Query (strict Zod): `provider`, `signatureValid` (`'true' \| 'false'`), `connectorId`, `limit` (1-100, default 30), `cursor`. Unknown query params return `400`. |
| `POST` | `/api/v1/workspace/webhooks/deliveries/:id/replay`      | Replay — `404 WEBHOOK_DELIVERY_NOT_FOUND` when missing                                           |

Auth: `GET` requires `ADMIN` or `OPERATOR`; replay requires `ADMIN`.

---

## Important Request Shapes

### Create connector

```json
{
  "name": "Engineering GitHub",
  "provider": "GITHUB",
  "permissionLevel": "READ",
  "scopes": ["repo", "read:user"],
  "metadata": {
    "organization": "acme"
  }
}
```

### Search

```json
{
  "query": "routing replay regression",
  "limit": 8,
  "types": ["ISSUE", "DOCUMENT"],
  "providers": ["GITHUB", "JIRA"]
}
```

### Create action draft

```json
{
  "connectorId": "ck_workspace_connector",
  "actionType": "CREATE_ISSUE",
  "payload": {
    "title": "Investigate routing mismatch",
    "body": "Linked from chat escalation"
  },
  "expiresInHours": 24
}
```

---

## How Chat Uses Workspace Search

`chat-service` calls `/api/v1/internal/workspace/search` during context assembly. The response is turned into citations and injected alongside memories, context packs, files, and thread history.

That keeps workspace grounding inside service boundaries:

- no direct cross-database reads
- no workspace provider calls from chat
- workspace search can fail gracefully without breaking chat delivery

---

## Status and Workflow Concepts

### Connector status

- `CONNECTED`
- `DEGRADED`
- `DISCONNECTED`
- `PENDING_AUTH`
- `UNKNOWN`

### Action status

- `PENDING_APPROVAL`
- `APPROVED`
- `REJECTED`
- `EXECUTING`
- `EXECUTED`
- `FAILED`
- `EXPIRED`

---

## Key Environment Variables

| Variable                                                                                | Purpose                                                                |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `WORKSPACE_DATABASE_URL`                                                                | PostgreSQL connection string                                           |
| `WORKSPACE_PORT`                                                                        | HTTP port                                                              |
| `WORKSPACE_SERVICE_URL`                                                                 | Internal service URL                                                   |
| `PG_WORKSPACE_USER` / `PG_WORKSPACE_PASSWORD` / `PG_WORKSPACE_DB` / `PG_WORKSPACE_PORT` | Database container config                                              |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`                                             | GitHub OAuth                                                           |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET`                                               | Slack OAuth                                                            |
| `JIRA_CLIENT_ID` / `JIRA_CLIENT_SECRET`                                                 | Jira OAuth                                                             |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`                                             | Google OAuth                                                           |
| `ENCRYPTION_KEY`                                                                        | Token encryption                                                       |
| `WORKSPACE_SCHEDULER_ENABLED`                                                           | Master kill-switch for the background sync scheduler (default `true`)  |
| `WORKSPACE_SCHEDULER_TICK_CRON`                                                         | Cron expression for the scheduler tick (default `*/30 * * * * *`)      |
| `WORKSPACE_SYNC_STALE_DETECTOR_CRON`                                                    | Cron expression for the stale detector (default `*/60 * * * * *`)      |
| `WORKSPACE_SYNC_STALE_MULTIPLIER`                                                       | Flip to DEGRADED when `lastSyncAt < now - N × cadence` (default `3`)   |
| `WORKSPACE_SYNC_DEFAULT_INTERVAL_SECONDS`                                               | Fallback cadence when no SyncCadenceDefault row exists (default `600`) |
| `WORKSPACE_SYNC_MAX_CONCURRENT_GLOBAL`                                                  | Global concurrency cap for sync runs (default `20`)                    |
| `WORKSPACE_SYNC_MAX_CONCURRENT_PER_PROVIDER`                                            | Per-provider cap (default `5`)                                         |
| `WORKSPACE_SYNC_MAX_CONCURRENT_PER_CONNECTOR`                                           | Per-connector cap (default `1`)                                        |
| `WORKSPACE_SYNC_RETRY_MAX_ATTEMPTS`                                                     | Retry attempts before DLQ (default `3`)                                |
| `WORKSPACE_SYNC_RETRY_BASE_MS`                                                          | Exponential backoff base (default `1000`)                              |
| `WORKSPACE_SYNC_RETRY_JITTER_MS`                                                        | Jitter cap added on top of backoff (default `500`)                     |
| `WORKSPACE_SYNC_DLQ_ROUTING_PREFIX`                                                     | DLQ routing-key prefix (default `workspace.sync.dlq`)                  |

---

## Scheduled sync architecture (Stream 01 v1)

The workspace service runs an in-process scheduler built on `@nestjs/schedule`. It eliminates the pre-v1 requirement that operators click "Sync now" on every connector. Flow:

```
@Cron('*/30 * * * * *') WorkspaceSyncSchedulerManager
    → acquires Postgres advisory lock (single-replica election)
    → loads connectors via findScheduleCandidates
    → computes eligibility per connector (cadence + lastSyncAt)
    → publishes `workspace.sync.tick.<provider>` to claw.events
WorkspaceSyncConsumer (subscribe `workspace.sync.tick.*`)
    → dedups against in-flight WorkspaceSyncRun
    → invokes WorkspaceSyncManager.syncConnector
WorkspaceSyncManager
    → opens sync run with cursor_before / isDryRun / triggeredBy
    → adapter.syncObjects(token, cursor) with exponential retry + jitter
    → on success: upsert objects, update deltaToken/lastSyncAt, publish run_completed
    → on terminal failure: publish run_failed + DLQ + dlq_sent
```

Per-provider cadence defaults live in table `workspace_sync_cadence_defaults`. Operators can override per connector via `WorkspaceConnector.syncIntervalSeconds`. A separate `@Cron('*/60 * * * * *')` job (`StaleDetectorManager`) flips connectors whose `lastSyncAt` is older than `cadence × WORKSPACE_SYNC_STALE_MULTIPLIER` to `DEGRADED` and emits `workspace.sync.stale_detected`.

### New endpoints

| Endpoint                                   | Method | Purpose                                                                               |
| ------------------------------------------ | ------ | ------------------------------------------------------------------------------------- |
| `/api/v1/workspace/sync/dashboard`         | GET    | Admin-only aggregate view: per-connector freshness, success rate, scheduler heartbeat |
| `/api/v1/workspace/connectors/:id/cadence` | PATCH  | Override `syncIntervalSeconds` for one connector                                      |
| `/api/v1/workspace/connectors/:id/pause`   | POST   | Flip connector to `PAUSED`; scheduler skips on next tick                              |
| `/api/v1/workspace/connectors/:id/resume`  | POST   | Flip `PAUSED` → `CONNECTED`                                                           |
| `/api/v1/workspace/connectors/:id/sync`    | POST   | Manual sync; supports `?delta`, `?priority`, `?dryRun`                                |
| `/internal/workspace/sync/health`          | GET    | Internal probe for claw-health-service (service-role JWT)                             |

### New events

`workspace.sync.run_started`, `workspace.sync.run_completed`, `workspace.sync.run_failed`, `workspace.sync.stale_detected`, `workspace.sync.manual_triggered`, `workspace.sync.paused`, `workspace.sync.resumed`, `workspace.sync.rate_limited`, `workspace.sync.dlq_sent`. All consumed by `claw-audit-service` via `WorkspaceSyncAuditConsumer`.

### Delta cursor support matrix (v1)

- Gmail — true delta via `historyId`; falls back to full poll on 404/410.
- Jira — true delta via `updated >= "<ISO>"` JQL; falls back to `updated >= -30d` window.
- GitHub — hybrid delta via `since=` on repos + issues; PRs client-filter by `updated_at`.
- Other 9 adapters — full poll on cadence (delta upgrade queued for v1.5).

---

## USER VIEW + CONNECT Permission Scope (2026-05-30)

Two narrow permissions were added so the new `USER` role can self-serve
workspace connections without admins giving away write access to the
provider-app-config catalog:

| Permission                  | Granted to USER | Unlocks                                                                                  |
| --------------------------- | --------------- | ---------------------------------------------------------------------------------------- |
| `WORKSPACE_VIEW`            | Yes             | Read access to the workspace shell and provider listing endpoints.                       |
| `WORKSPACE_APP_CONFIG_VIEW` | Yes             | Browse admin-created provider-app-configs (sanitised — `hasSecret: boolean`, no secret). |
| `WORKSPACE_CONNECT_OWN`     | Yes             | Create / update / delete the user's own `WorkspaceConnector` row.                        |
| `WORKSPACE_READ_OWN`        | Yes             | List + read the user's own connectors, objects, and action drafts.                       |
| `WORKSPACE_SYNC_OWN`        | Yes             | Trigger sync, pause/resume, override cadence on the user's own connectors.               |
| `WORKSPACE_ACTION_OWN`      | Yes             | Approve / reject action drafts the user owns.                                            |

### Partial-relax model

The split is deliberate: USER reads (provider catalog, provider-app-configs)
and connects (own connectors), but admin owns infrastructure mutations. The
matrix below summarises:

| Endpoint group                                          | USER  | ADMIN     | Backing permission                       |
| ------------------------------------------------------- | ----- | --------- | ---------------------------------------- |
| `GET /workspace/providers[/:provider]`                  | Read  | Read      | (any authenticated role)                 |
| `GET /workspace/provider-app-configs[/:id]`             | Read  | Read      | `WORKSPACE_APP_CONFIG_VIEW`              |
| `POST / PUT / DELETE /workspace/provider-app-configs`   | --    | Full CRUD | `ADMIN_WORKSPACE_AUTOMATION_MANAGE`      |
| `GET / POST / PATCH / DELETE /workspace/connectors[*]`  | Own   | All       | `WORKSPACE_CONNECT_OWN` / `*_READ_OWN`   |
| `POST /workspace/connectors/:id/health\|sync\|pause\|resume\|cadence` | Own | All | `WORKSPACE_SYNC_OWN`                    |
| `POST /workspace/oauth/init` + `GET /oauth/callback`    | Own   | All       | `WORKSPACE_CONNECT_OWN`                  |
| `POST /workspace/search` + `GET /workspace/objects[*]`  | Own   | All       | `WORKSPACE_READ_OWN`                     |
| `GET / POST /workspace/actions[*]/approve\|reject`      | Own   | All       | `WORKSPACE_ACTION_OWN`                   |
| `GET /workspace/ai-actions/policies[*]`                 | --    | All       | `ADMIN_WORKSPACE_AUTOMATION_MANAGE`      |
| `POST / PATCH / DELETE /workspace/ai-actions/policies[*]` | --  | All       | `ADMIN_WORKSPACE_AUTOMATION_MANAGE`      |
| `GET / POST / PATCH / DELETE /workspace/suggestion-rules[*]` | -- | All     | `ADMIN_WORKSPACE_AUTOMATION_MANAGE`      |
| `GET /workspace/webhooks/deliveries`                    | --    | All       | `ADMIN_WORKSPACES_VIEW`                  |
| `POST /workspace/webhooks/deliveries/:id/replay`        | --    | All       | `ADMIN_WORKSPACE_AUTOMATION_MANAGE`      |
| `GET /workspace/sync/dashboard`                         | --    | All       | `ADMIN_WORKSPACES_VIEW`                  |

All endpoints carry both `@Roles(...)` AND
`@RequirePermissions(Permission.XXX)`. Roles gate the legacy enum-based
classes (so ADMIN, OPERATOR, VIEWER, USER each see what they should), and
`@RequirePermissions` is the modern entitlements check (admin can withhold any
single permission per-role via `PUT /api/v1/admin/roles/:id/permissions`). The
sanitised `ProviderAppConfigPublic` shape is the second line of defence — even
if `WORKSPACE_APP_CONFIG_VIEW` is mis-granted, no encrypted secret can leak.

See also: [Authorization & RBAC — Workspace partial-relax permission pattern](../03-architecture/authorization-rbac.md#workspace-partial-relax-permission-pattern).

---

## Related Docs

- [Services Index](services-index.md)
- [Inter-Service Communication](inter-service-communication.md)
- [API Reference](../12-reference/api-reference.md)
