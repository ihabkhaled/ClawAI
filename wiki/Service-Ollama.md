# Ollama Service

**Workspace:** [`apps/claw-ollama-service`](https://github.com/ihabkhaled/ClawAI/tree/main/apps/claw-ollama-service)  
**Port:** 4008  
**Database:** postgresql  
**Test runner:** vitest · **18 test files**  
**API endpoints:** 35

## Responsibilities and boundaries

This page is generated from the current machine-readable service, API, event, and test manifests. The service owns its process and persistence boundary; cross-service work must use explicit HTTP contracts or RabbitMQ events rather than reaching into another service's database.

## Internal dependencies

- `@claw/shared-constants`
- `@claw/shared-entitlements`
- `@claw/shared-rabbitmq`
- `@claw/shared-types`
- `@claw/shared-utilities`

## Data models

- `DiscoverySource`
- `LocalModel`
- `LocalModelRoleAssignment`
- `ModelCatalogEntry`
- `ModelDiscoveryCandidate`
- `ModelDiscoveryRun`
- `PullJob`
- `RuntimeConfig`

## HTTP API

| Method | Route | Source |
|---|---|---|
| `GET` | `/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/health/controllers/health.controller.ts) |
| `GET` | `/internal/ollama/installed-models` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-internal.controller.ts) |
| `GET` | `/internal/ollama/installed-snapshot` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-internal.controller.ts) |
| `GET` | `/internal/ollama/router-model` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-internal.controller.ts) |
| `POST` | `/ollama/assign-role` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| `GET` | `/ollama/catalog` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| `GET` | `/ollama/catalog/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| `POST` | `/ollama/catalog/:id/pull` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| `POST` | `/ollama/catalog/admin` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| `DELETE` | `/ollama/catalog/admin/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| `PUT` | `/ollama/catalog/admin/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| `POST` | `/ollama/catalog/reclassify` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| `POST` | `/ollama/chat` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| `GET` | `/ollama/discovery/candidates` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| `POST` | `/ollama/discovery/candidates/:id/approve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| `POST` | `/ollama/discovery/candidates/:id/reject` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| `POST` | `/ollama/discovery/candidates/bulk-approve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| `POST` | `/ollama/discovery/refresh` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| `GET` | `/ollama/discovery/runs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| `GET` | `/ollama/discovery/runs/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| `GET` | `/ollama/discovery/sources` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| `POST` | `/ollama/discovery/sources` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| `DELETE` | `/ollama/discovery/sources/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| `PUT` | `/ollama/discovery/sources/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| `POST` | `/ollama/generate` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| `GET` | `/ollama/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| `GET` | `/ollama/models` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| `DELETE` | `/ollama/models/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| `GET` | `/ollama/packs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| `POST` | `/ollama/packs/:profile/install` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| `POST` | `/ollama/pull` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| `GET` | `/ollama/pull-jobs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| `DELETE` | `/ollama/pull-jobs/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| `GET` | `/ollama/runtime-progress/probe` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/runtime-progress/controllers/runtime-progress.controller.ts) |
| `GET` | `/ollama/runtimes` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |

## Events produced

| Pattern | Consumers |
|---|---|
| `connector.synced` | `claw-audit-service`, `claw-routing-service` |
| `connector.updated` | `claw-audit-service` |
| `log.server` | — |

## Events consumed

| Pattern | Producers |
|---|---|
| — | — |

## Where to go next

- [[Backend-Services]] for the platform-wide service catalog.
- [[API-Reference]] for cross-service API documentation.
- [[Event-Bus]] for messaging conventions and reliability.
- [[Database-Reference]] for storage ownership.
- [Workspace AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/AGENTS.md) for generated, service-local agent context.
