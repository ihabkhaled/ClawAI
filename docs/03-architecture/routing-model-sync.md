# Routing Model Knowledge Sync (Phase 6)

## Overview

The Smart Router scores every candidate model from a single source of truth: the `RouterModelRegistry` table in the routing-service database (`claw_routing`). That registry is not authored by hand — it is **synced** from the services that actually own model state:

- **connector-service** — cloud provider models (OpenAI, Anthropic, Gemini, Grok, Bedrock, DeepSeek)
- **ollama-service** — installed local Ollama models
- **llamacpp-service** — frontier open-weight models whose weights are downloaded and ready

This document describes the sync contract, the snapshot endpoints, admin-override preservation, and the audit trail.

---

## Why a sync, not a live query

The router runs on the hot path of every routed message. It cannot afford three cross-service HTTP calls per decision. Instead, the registry is a **local read replica** of upstream model state, refreshed by an explicit sync run. Routing decisions read only the local registry; the sync keeps it fresh.

---

## The snapshot contract

Each upstream service exposes one internal, unauthenticated (`@Public`) endpoint that returns its current model state as a flat list:

| Service           | Endpoint                                          | Returns                                                |
| ----------------- | ------------------------------------------------- | ------------------------------------------------------ |
| connector-service | `GET /api/v1/internal/connectors/models-snapshot` | Enabled connectors × `ACTIVE`-lifecycle models         |
| ollama-service    | `GET /api/v1/internal/ollama/installed-snapshot`  | Installed local models (`modelKey = "name:tag"`)       |
| llamacpp-service  | `GET /api/v1/internal/llamacpp/loaded-snapshot`   | Frontier catalog entries with `downloadStatus = READY` |

All three return the same envelope:

```jsonc
{
  "models": [
    {
      "provider": "OPENAI",
      "modelKey": "gpt-4o",
      "displayName": "GPT-4o",
      "family": "gpt-4", // optional
      "isLocal": false,
      "modalitiesIn": ["TEXT", "IMAGE_INPUT"],
      "modalitiesOut": ["TEXT"],
      "contextWindowTokens": 128000, // optional
    },
  ],
  "generatedAt": "2026-05-14T12:00:00.000Z",
}
```

Each snapshot is built by a focused `RoutingSnapshotManager` (connector-service uses `ModelsSnapshotManager`) so the upstream service's controller stays thin. The endpoints are `@Public` because they are reachable only on the internal Docker network — nginx never proxies `/api/v1/internal/*`.

### Why these filters

- connector-service skips disabled connectors and non-`ACTIVE` models so the router never proposes a provider an operator turned off.
- ollama-service returns only **installed** models — not the full pull-able catalog — so the router never routes to a model that isn't on disk.
- llamacpp-service returns only `downloadStatus = READY` entries so the router never routes to a frontier model whose weights are still downloading.

---

## The sync run

`RouterSyncManager.syncAll()` in the routing-service:

1. Resolves each upstream base URL from env (`CONNECTOR_SERVICE_URL`, `OLLAMA_SERVICE_URL`, `LLAMACPP_SERVICE_URL`) with Docker-network fallbacks.
2. Calls each snapshot endpoint via `fetchSnapshot()`, which classifies the outcome as `OK`, `UPSTREAM_404`, or `UPSTREAM_ERROR`.
3. For each `OK` snapshot, upserts every model into `RouterModelRegistry` keyed by `(provider, modelKey)`, stamping `metadataSource = "sync:<SOURCE>"` and `lastSyncedAt`.
4. Aggregates per-provider counts into a `SyncRunResult` and publishes `routing.models.synced`.

### Graceful degradation

A `404` from an upstream endpoint is treated as **`UPSTREAM_404` — "this source has no data yet"**, not an error. This is deliberate: it let the routing-service ship its sync infrastructure before the upstream endpoints existed. With all three endpoints now live, `UPSTREAM_404` should not appear in production — but the path remains as a safety net if an upstream is rolled back.

A network failure or `5xx` is `UPSTREAM_ERROR`: the per-provider result records the message, the other two sources still sync, and the run completes.

### Triggering a sync

`POST /api/v1/routing/models/sync` (ADMIN only) runs `syncAll()` on demand. There is no scheduled cron yet — sync is operator-triggered.

---

## Admin-override preservation

Operators can override registry fields (cost, quality tier, lifecycle, etc.) through the Model Registry admin UI. Those overrides are stored as `RouterAdminOverride` rows. During a sync, `RouterSyncManager` asks `RouterModelRegistryManager.getProtectedFieldNames(profileId)` for the set of overridden fields and **omits them from the update payload**. Upstream data refreshes everything else; the operator's intent is never silently clobbered.

A brand-new model (no existing registry row) has no protected fields — every field comes from the snapshot.

---

## Audit trail

When a sync run finishes, `RouterSyncManager` publishes `routing.models.synced` on the `claw.events` exchange:

```jsonc
{
  "runStartedAt": "2026-05-14T12:00:00.000Z",
  "runFinishedAt": "2026-05-14T12:00:03.120Z",
  "durationMs": 3120,
  "totals": { "upstreamCount": 142, "upsertedCount": 140, "skippedCount": 2 },
  "perProvider": [
    {
      "provider": "CLOUD",
      "status": "OK",
      "upstreamCount": 120,
      "upsertedCount": 120,
      "skippedCount": 0,
    },
    {
      "provider": "OLLAMA",
      "status": "OK",
      "upstreamCount": 18,
      "upsertedCount": 18,
      "skippedCount": 0,
    },
    {
      "provider": "LLAMACPP",
      "status": "OK",
      "upstreamCount": 4,
      "upsertedCount": 2,
      "skippedCount": 2,
    },
  ],
}
```

The audit-service `RoutingAuditConsumer` subscribes to `routing.models.synced` and writes an `AuditLog` row (`action = ROUTING_MODELS_SYNCED`, `severity = LOW`, `entityType = router`). Publishing is best-effort — if the broker is down, the sync still completes and the failure is logged as a warning, never thrown.

---

## Files

| Concern                         | Location                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| Sync orchestration              | `apps/claw-routing-service/src/modules/sync/managers/router-sync.manager.ts`             |
| Snapshot fetch + classification | `apps/claw-routing-service/src/modules/sync/utilities/snapshot-fetcher.utility.ts`       |
| Admin sync endpoint             | `apps/claw-routing-service/src/modules/sync/controllers/router-sync.controller.ts`       |
| connector snapshot              | `apps/claw-connector-service/src/modules/connectors/managers/models-snapshot.manager.ts` |
| ollama snapshot                 | `apps/claw-ollama-service/src/modules/ollama/managers/routing-snapshot.manager.ts`       |
| llamacpp snapshot               | `apps/claw-llamacpp-service/src/modules/catalog/managers/routing-snapshot.manager.ts`    |
| Audit consumer                  | `apps/claw-audit-service/src/modules/audits/consumers/routing.consumer.ts`               |
