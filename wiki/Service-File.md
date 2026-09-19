# File Service

**Workspace:** [`apps/claw-file-service`](https://github.com/ihabkhaled/ClawAI/tree/main/apps/claw-file-service)  
**Port:** 4006  
**Database:** postgresql  
**Test runner:** vitest · **20 test files**  
**API endpoints:** 17

## Responsibilities and boundaries

This page is generated from the current machine-readable service, API, event, and test manifests. The service owns its process and persistence boundary; cross-service work must use explicit HTTP contracts or RabbitMQ events rather than reaching into another service's database.

## Internal dependencies

- `@claw/shared-constants`
- `@claw/shared-entitlements`
- `@claw/shared-rabbitmq`
- `@claw/shared-types`
- `@claw/shared-utilities`

## Data models

- `File`
- `FileChunk`

## HTTP API

| Method | Route | Source |
|---|---|---|
| `GET` | `/files` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files.controller.ts) |
| `DELETE` | `/files/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files.controller.ts) |
| `GET` | `/files/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files.controller.ts) |
| `GET` | `/files/:id/chunks` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files.controller.ts) |
| `GET` | `/files/download/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files.controller.ts) |
| `POST` | `/files/upload` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files.controller.ts) |
| `GET` | `/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/health/controllers/health.controller.ts) |
| `GET` | `/internal/files/:id/chunks` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |
| `GET` | `/internal/files/:id/content` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |
| `GET` | `/internal/files/:id/ingestion-state` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |
| `GET` | `/internal/files/download-internal/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |
| `GET` | `/internal/files/download/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |
| `GET` | `/internal/files/metadata-internal/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |
| `POST` | `/internal/files/publish-copy` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |
| `DELETE` | `/internal/files/published-copy/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |
| `POST` | `/internal/files/store-image` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |
| `POST` | `/internal/files/upload-internal` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |

## Events produced

| Pattern | Consumers |
|---|---|
| `file.archive_expanded` | `claw-audit-service` |
| `file.chunked` | `claw-audit-service` |
| `file.deleted` | `claw-audit-service` |
| `file.downloaded` | `claw-audit-service` |
| `file.extraction_failed` | `claw-audit-service` |
| `file.failed` | `claw-audit-service` |
| `file.ocr_completed` | `claw-audit-service` |
| `file.ocr_failed` | `claw-audit-service` |
| `file.ocr_started` | `claw-audit-service` |
| `file.retention_expired` | `claw-audit-service` |
| `file.upload_completed` | `claw-audit-service` |
| `file.upload_started` | `claw-audit-service` |
| `file.uploaded` | `claw-audit-service` |
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
- [Workspace AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/AGENTS.md) for generated, service-local agent context.
