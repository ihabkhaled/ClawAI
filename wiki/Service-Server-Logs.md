# Server Logs Service

**Workspace:** [`apps/claw-server-logs-service`](https://github.com/ihabkhaled/ClawAI/tree/main/apps/claw-server-logs-service)  
**Port:** environment-defined  
**Database:** mongodb  
**Test runner:** vitest · **9 test files**  
**API endpoints:** 8

## Responsibilities and boundaries

This page is generated from the current machine-readable service, API, event, and test manifests. The service owns its process and persistence boundary; cross-service work must use explicit HTTP contracts or RabbitMQ events rather than reaching into another service's database.

## Internal dependencies

- `@claw/shared-constants`
- `@claw/shared-entitlements`
- `@claw/shared-rabbitmq`
- `@claw/shared-types`
- `@claw/shared-utilities`

## Data models

- `ServerLog`

## HTTP API

| Method | Route | Source |
|---|---|---|
| `GET` | `/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/health/controllers/health.controller.ts) |
| `GET` | `/server-logs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/controllers/server-logs.controller.ts) |
| `POST` | `/server-logs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/controllers/server-logs.controller.ts) |
| `POST` | `/server-logs/batch` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/controllers/server-logs.controller.ts) |
| `GET` | `/server-logs/distinct` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/controllers/server-logs.controller.ts) |
| `POST` | `/server-logs/ingest/containers` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/controllers/server-logs.controller.ts) |
| `GET` | `/server-logs/stats` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/controllers/server-logs.controller.ts) |
| `GET` | `/server-logs/timeseries` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/controllers/server-logs.controller.ts) |

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
- [Workspace AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/AGENTS.md) for generated, service-local agent context.
