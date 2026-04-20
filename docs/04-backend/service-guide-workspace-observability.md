# Service Guide: Workspace Observability

## What This Adds

Prompt 23 asks for operational tooling around workspace connectors. The existing service already tracks the raw data (sync runs, health events, audit logs, action executions); this pass exposes it through owner-scoped endpoints so the frontend can build diagnostics views without new collection logic.

## Endpoints (all owner-scoped)

| Method | Path                                               | Response                     |
| ------ | -------------------------------------------------- | ---------------------------- |
| GET    | `/workspace/connectors/:id/sync-runs?limit=20`     | `WorkspaceSyncRun[]`         |
| GET    | `/workspace/connectors/:id/health-events?limit=20` | `WorkspaceHealthEvent[]`     |
| GET    | `/workspace/actions?connectorId=...&status=...`    | Paginated `WorkspaceAction`  |
| GET    | `/workspace/connectors/:id`                        | Connector + last health/sync |

All endpoints assert the connector belongs to the caller (403 `FORBIDDEN` otherwise) and return 404 when the connector does not exist.

## Ingredients Already in Place

- `WorkspaceHealthEvent` is written on every connector health check (`WorkspaceHealthManager`).
- `WorkspaceSyncRun` is written on every sync attempt with `objectsFound/Synced/Failed`, `status`, `errorMessage`.
- `WorkspaceAction` stores draft → approved → executed/failed state plus `errorMessage` and external `resultRef`.
- Every mutation publishes an event to `claw.events` (audited by audit-service).

## Gap Intentionally Deferred

- Admin-scoped view across **all** users' connectors. The current endpoints are owner-scoped; a platform-admin diagnostics page should reuse these repositories but bypass the ownership check behind a `RolesGuard(ADMIN)` gate.
- Per-provider error aggregation (e.g. "Slack 5xx count last 24h") is a reporting query, not a new data capture. A future admin dashboard can compute it from the existing tables.
- Backfill / re-sync-from-date actions: the sync endpoint supports `?delta=false` for a full resync; a date-scoped backfill is a larger refactor to the sync manager.
