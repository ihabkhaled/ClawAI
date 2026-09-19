# Llamacpp Service

**Workspace:** [`apps/claw-llamacpp-service`](https://github.com/ihabkhaled/ClawAI/tree/main/apps/claw-llamacpp-service)  
**Port:** 4017  
**Database:** postgresql  
**Test runner:** vitest · **17 test files**  
**API endpoints:** 26

## Responsibilities and boundaries

This page is generated from the current machine-readable service, API, event, and test manifests. The service owns its process and persistence boundary; cross-service work must use explicit HTTP contracts or RabbitMQ events rather than reaching into another service's database.

## Internal dependencies

- `@claw/shared-constants`
- `@claw/shared-entitlements`
- `@claw/shared-rabbitmq`
- `@claw/shared-types`
- `@claw/shared-utilities`

## Data models

- `BinaryRelease`
- `FrontierCatalogEntry`
- `HardwareSnapshot`
- `ModelLoadEvent`
- `PreflightOverrideAudit`
- `PullJob`
- `RuntimeConfig`

## HTTP API

| Method | Route | Source |
|---|---|---|
| `GET` | `/catalog` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog.controller.ts) |
| `GET` | `/catalog/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog.controller.ts) |
| `POST` | `/catalog/:id/pull` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/controllers/pull-jobs.controller.ts) |
| `POST` | `/catalog/hf-auto-sync` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog.controller.ts) |
| `POST` | `/catalog/hf-import` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog.controller.ts) |
| `GET` | `/catalog/hf-models/:author/:name` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog.controller.ts) |
| `GET` | `/catalog/hf-search` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog.controller.ts) |
| `POST` | `/catalog/refresh` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog.controller.ts) |
| `GET` | `/hardware` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/hardware/controllers/hardware.controller.ts) |
| `POST` | `/hardware/refresh` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/hardware/controllers/hardware.controller.ts) |
| `GET` | `/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/health/controllers/health.controller.ts) |
| `GET` | `/internal/llamacpp/loaded-snapshot` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog-internal.controller.ts) |
| `PUT` | `/models/:id/config` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/controllers/models-lifecycle.controller.ts) |
| `POST` | `/models/:id/load` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/controllers/models-lifecycle.controller.ts) |
| `POST` | `/models/:id/unload` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/controllers/models-lifecycle.controller.ts) |
| `DELETE` | `/models/:id/weights` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/controllers/models-lifecycle.controller.ts) |
| `GET` | `/models/loaded` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/controllers/models-lifecycle.controller.ts) |
| `GET` | `/pull-jobs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/controllers/pull-jobs.controller.ts) |
| `DELETE` | `/pull-jobs/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/controllers/pull-jobs.controller.ts) |
| `GET` | `/pull-jobs/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/controllers/pull-jobs.controller.ts) |
| `POST` | `/pull-jobs/:id/retry` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/controllers/pull-jobs.controller.ts) |
| `GET` | `/runtime-progress/probe` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/runtime-progress/controllers/runtime-progress.controller.ts) |
| `GET` | `/runtime/info` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/binary/controllers/binary.controller.ts) |
| `POST` | `/runtime/update` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/binary/controllers/binary.controller.ts) |
| `POST` | `/v1/chat/completions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/inference/controllers/inference.controller.ts) |
| `POST` | `/v1/completions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/inference/controllers/inference.controller.ts) |

## Events produced

| Pattern | Consumers |
|---|---|
| `llamacpp.binary.installed` | `claw-audit-service` |
| `llamacpp.binary.updated` | `claw-audit-service` |
| `llamacpp.model.crashed` | `claw-audit-service`, `claw-routing-service` |
| `llamacpp.model.loaded` | `claw-audit-service`, `claw-routing-service` |
| `llamacpp.model.unloaded` | `claw-audit-service`, `claw-routing-service` |
| `llamacpp.preflight.overridden` | `claw-audit-service` |
| `llamacpp.pull.completed` | `claw-audit-service` |
| `llamacpp.pull.failed` | `claw-audit-service` |
| `llamacpp.pull.progress` | `claw-audit-service` |
| `llamacpp.pull.started` | `claw-audit-service` |
| `llamacpp.weights.deleted` | `claw-audit-service` |
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
- [Workspace AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/AGENTS.md) for generated, service-local agent context.
