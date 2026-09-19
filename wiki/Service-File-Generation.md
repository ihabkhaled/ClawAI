# File Generation Service

**Workspace:** [`apps/claw-file-generation-service`](https://github.com/ihabkhaled/ClawAI/tree/main/apps/claw-file-generation-service)  
**Port:** 4013  
**Database:** postgresql  
**Test runner:** vitest · **7 test files**  
**API endpoints:** 7

## Responsibilities and boundaries

This page is generated from the current machine-readable service, API, event, and test manifests. The service owns its process and persistence boundary; cross-service work must use explicit HTTP contracts or RabbitMQ events rather than reaching into another service's database.

## Internal dependencies

- `@claw/shared-constants`
- `@claw/shared-rabbitmq`
- `@claw/shared-types`
- `@claw/shared-utilities`

## Data models

- `FileGeneration`
- `FileGenerationAsset`
- `FileGenerationEvent`

## HTTP API

| Method | Route | Source |
|---|---|---|
| `GET` | `/file-generations` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/controllers/file-generation.controller.ts) |
| `GET` | `/file-generations/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/controllers/file-generation.controller.ts) |
| `POST` | `/file-generations/:id/retry` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/controllers/file-generation.controller.ts) |
| `GET` | `/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/health/controllers/health.controller.ts) |
| `GET` | `/internal/file-generations/:generationId` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/controllers/internal-file-generation.controller.ts) |
| `POST` | `/internal/file-generations/:generationId/retry` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/controllers/internal-file-generation.controller.ts) |
| `POST` | `/internal/file-generations/generate` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/controllers/internal-file-generation.controller.ts) |

## Events produced

| Pattern | Consumers |
|---|---|
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
- [Workspace AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/AGENTS.md) for generated, service-local agent context.
