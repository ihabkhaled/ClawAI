# Image Service

**Workspace:** [`apps/claw-image-service`](https://github.com/ihabkhaled/ClawAI/tree/main/apps/claw-image-service)  
**Port:** 4012  
**Database:** postgresql  
**Test runner:** vitest · **12 test files**  
**API endpoints:** 9

## Responsibilities and boundaries

This page is generated from the current machine-readable service, API, event, and test manifests. The service owns its process and persistence boundary; cross-service work must use explicit HTTP contracts or RabbitMQ events rather than reaching into another service's database.

## Internal dependencies

- `@claw/shared-constants`
- `@claw/shared-entitlements`
- `@claw/shared-rabbitmq`
- `@claw/shared-types`
- `@claw/shared-utilities`

## Data models

- `ImageGeneration`
- `ImageGenerationAsset`
- `ImageGenerationEvent`

## HTTP API

| Method | Route | Source |
|---|---|---|
| `GET` | `/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/health/controllers/health.controller.ts) |
| `GET` | `/images` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/controllers/image-generation.controller.ts) |
| `GET` | `/images/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/controllers/image-generation.controller.ts) |
| `POST` | `/images/:id/retry` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/controllers/image-generation.controller.ts) |
| `POST` | `/images/:id/retry-alternate` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/controllers/image-generation.controller.ts) |
| `GET` | `/internal/images/:generationId` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/controllers/internal-image.controller.ts) |
| `POST` | `/internal/images/:generationId/retry` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/controllers/internal-image.controller.ts) |
| `POST` | `/internal/images/:generationId/retry-alternate` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/controllers/internal-image.controller.ts) |
| `POST` | `/internal/images/generate` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/controllers/internal-image.controller.ts) |

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
- [Workspace AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/AGENTS.md) for generated, service-local agent context.
