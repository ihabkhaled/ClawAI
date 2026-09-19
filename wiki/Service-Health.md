# Health Service

**Workspace:** [`apps/claw-health-service`](https://github.com/ihabkhaled/ClawAI/tree/main/apps/claw-health-service)  
**Port:** 4009  
**Database:** none  
**Test runner:** vitest · **4 test files**  
**API endpoints:** 1

## Responsibilities and boundaries

This page is generated from the current machine-readable service, API, event, and test manifests. The service owns its process and persistence boundary; cross-service work must use explicit HTTP contracts or RabbitMQ events rather than reaching into another service's database.

## Internal dependencies

- `@claw/shared-utilities`

## Data models

This service has no persisted Prisma/Mongoose models.

## HTTP API

| Method | Route | Source |
|---|---|---|
| `GET` | `/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/modules/health/controllers/health.controller.ts) |

## Events produced

| Pattern | Consumers |
|---|---|
| — | — |

## Events consumed

| Pattern | Producers |
|---|---|
| — | — |

## Where to go next

- [[Backend-Services]] for the platform-wide service catalog.
- [[API-Reference]] for cross-service API documentation.
- [[Event-Bus]] for messaging conventions and reliability.
- [[Database-Reference]] for storage ownership.
- [Workspace AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/AGENTS.md) for generated, service-local agent context.
