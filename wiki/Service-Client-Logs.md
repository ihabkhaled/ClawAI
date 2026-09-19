# Client Logs Service

**Workspace:** [`apps/claw-client-logs-service`](https://github.com/ihabkhaled/ClawAI/tree/main/apps/claw-client-logs-service)  
**Port:** environment-defined  
**Database:** mongodb  
**Test runner:** vitest · **6 test files**  
**API endpoints:** 6

## Responsibilities and boundaries

This page is generated from the current machine-readable service, API, event, and test manifests. The service owns its process and persistence boundary; cross-service work must use explicit HTTP contracts or RabbitMQ events rather than reaching into another service's database.

## Internal dependencies

- `@claw/shared-constants`
- `@claw/shared-rabbitmq`
- `@claw/shared-types`
- `@claw/shared-utilities`

## Data models

- `ClientLog`

## HTTP API

| Method | Route | Source |
|---|---|---|
| `GET` | `/client-logs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/controllers/client-logs.controller.ts) |
| `POST` | `/client-logs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/controllers/client-logs.controller.ts) |
| `POST` | `/client-logs/batch` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/controllers/client-logs.controller.ts) |
| `GET` | `/client-logs/distinct` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/controllers/client-logs.controller.ts) |
| `GET` | `/client-logs/stats` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/controllers/client-logs.controller.ts) |
| `GET` | `/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/health/controllers/health.controller.ts) |

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
- [Workspace AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/AGENTS.md) for generated, service-local agent context.
