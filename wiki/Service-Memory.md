# Memory Service

**Workspace:** [`apps/claw-memory-service`](https://github.com/ihabkhaled/ClawAI/tree/main/apps/claw-memory-service)  
**Port:** 4005  
**Database:** postgresql  
**Test runner:** vitest · **14 test files**  
**API endpoints:** 46

## Responsibilities and boundaries

This page is generated from the current machine-readable service, API, event, and test manifests. The service owns its process and persistence boundary; cross-service work must use explicit HTTP contracts or RabbitMQ events rather than reaching into another service's database.

## Internal dependencies

- `@claw/shared-constants`
- `@claw/shared-entitlements`
- `@claw/shared-rabbitmq`
- `@claw/shared-types`
- `@claw/shared-utilities`

## Data models

- `ContextPack`
- `ContextPackAttachment`
- `ContextPackItem`
- `ContextPackTemplate`
- `ContextPackUsage`
- `ContextPackVersion`
- `MemoryAuditLog`
- `MemoryPreference`
- `MemoryRecord`
- `MemorySuggestion`
- `MemoryUsage`
- `WorkspaceObjectEmbedding`

## HTTP API

| Method | Route | Source |
|---|---|---|
| `GET` | `/context-pack-templates` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-templates/controllers/context-pack-templates.controller.ts) |
| `POST` | `/context-pack-templates/:id/clone` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-templates/controllers/context-pack-templates.controller.ts) |
| `GET` | `/context-packs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/controllers/context-packs.controller.ts) |
| `POST` | `/context-packs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/controllers/context-packs.controller.ts) |
| `DELETE` | `/context-packs/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/controllers/context-packs.controller.ts) |
| `GET` | `/context-packs/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/controllers/context-packs.controller.ts) |
| `PATCH` | `/context-packs/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/controllers/context-packs.controller.ts) |
| `GET` | `/context-packs/:id/export` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-portable/controllers/context-pack-portable.controller.ts) |
| `POST` | `/context-packs/:id/items` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/controllers/context-packs.controller.ts) |
| `DELETE` | `/context-packs/:id/items/:itemId` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/controllers/context-packs.controller.ts) |
| `GET` | `/context-packs/:id/versions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-versions/controllers/context-pack-versions.controller.ts) |
| `GET` | `/context-packs/:id/versions/:from/diff/:to` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-versions/controllers/context-pack-versions.controller.ts) |
| `GET` | `/context-packs/:id/versions/:version` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-versions/controllers/context-pack-versions.controller.ts) |
| `POST` | `/context-packs/:id/versions/:version/revert` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-versions/controllers/context-pack-versions.controller.ts) |
| `POST` | `/context-packs/:id/versions/snapshot` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-versions/controllers/context-pack-versions.controller.ts) |
| `POST` | `/context-packs/import` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-portable/controllers/context-pack-portable.controller.ts) |
| `GET` | `/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/health/controllers/health.controller.ts) |
| `GET` | `/internal/context-packs/:id/items` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/controllers/context-packs-internal.controller.ts) |
| `POST` | `/internal/embeddings/delete-by-object-id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/embeddings/controllers/embeddings.controller.ts) |
| `POST` | `/internal/embeddings/search-workspace-objects` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/embeddings/controllers/embeddings.controller.ts) |
| `POST` | `/internal/embeddings/upsert-workspace-object` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/embeddings/controllers/embeddings.controller.ts) |
| `POST` | `/internal/memories/automation-preference` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory-internal.controller.ts) |
| `GET` | `/internal/memories/for-context` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory-internal.controller.ts) |
| `GET` | `/internal/memories/learned-preferences` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory-internal.controller.ts) |
| `POST` | `/internal/memories/record-usage` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory-retrieval.controller.ts) |
| `POST` | `/internal/memories/retrieve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory-retrieval.controller.ts) |
| `GET` | `/memories` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory.controller.ts) |
| `POST` | `/memories` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory.controller.ts) |
| `GET` | `/memories-portable/export` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-portable/controllers/memory-portable.controller.ts) |
| `POST` | `/memories-portable/import` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-portable/controllers/memory-portable.controller.ts) |
| `DELETE` | `/memories/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory.controller.ts) |
| `GET` | `/memories/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory.controller.ts) |
| `PATCH` | `/memories/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory.controller.ts) |
| `PATCH` | `/memories/:id/toggle` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory.controller.ts) |
| `POST` | `/memories/search` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory.controller.ts) |
| `GET` | `/memory-audit` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-audit/controllers/memory-audit.controller.ts) |
| `GET` | `/memory-audit/:memoryId` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-audit/controllers/memory-audit.controller.ts) |
| `GET` | `/memory-preferences` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-preferences/controllers/memory-preferences.controller.ts) |
| `PUT` | `/memory-preferences` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-preferences/controllers/memory-preferences.controller.ts) |
| `GET` | `/memory-suggestions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-suggestions/controllers/memory-suggestions.controller.ts) |
| `DELETE` | `/memory-suggestions/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-suggestions/controllers/memory-suggestions.controller.ts) |
| `POST` | `/memory-suggestions/:id/approve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-suggestions/controllers/memory-suggestions.controller.ts) |
| `POST` | `/memory-suggestions/:id/reject` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-suggestions/controllers/memory-suggestions.controller.ts) |
| `POST` | `/memory-suggestions/bulk-approve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-suggestions/controllers/memory-suggestions.controller.ts) |
| `GET` | `/memory-usage/by-memory/:memoryId` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-usage/controllers/memory-usage.controller.ts) |
| `GET` | `/memory-usage/by-message/:messageId` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-usage/controllers/memory-usage.controller.ts) |

## Events produced

| Pattern | Consumers |
|---|---|
| `context_pack.version_created` | — |
| `context_pack.version_reverted` | — |
| `log.server` | — |
| `memory.approved` | — |
| `memory.extracted` | `claw-audit-service` |
| `memory.forgotten` | — |
| `memory.redacted` | — |
| `memory.rejected` | — |
| `memory.suggested` | — |

## Events consumed

| Pattern | Producers |
|---|---|
| `message.completed` | `claw-chat-service` |

## Where to go next

- [[Backend-Services]] for the platform-wide service catalog.
- [[API-Reference]] for cross-service API documentation.
- [[Event-Bus]] for messaging conventions and reliability.
- [[Database-Reference]] for storage ownership.
- [Workspace AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/AGENTS.md) for generated, service-local agent context.
