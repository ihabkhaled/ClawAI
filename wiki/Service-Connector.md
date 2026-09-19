# Connector Service

**Workspace:** [`apps/claw-connector-service`](https://github.com/ihabkhaled/ClawAI/tree/main/apps/claw-connector-service)  
**Port:** 4003  
**Database:** postgresql  
**Test runner:** vitest · **26 test files**  
**API endpoints:** 19

## Responsibilities and boundaries

This page is generated from the current machine-readable service, API, event, and test manifests. The service owns its process and persistence boundary; cross-service work must use explicit HTTP contracts or RabbitMQ events rather than reaching into another service's database.

## Internal dependencies

- `@claw/shared-constants`
- `@claw/shared-entitlements`
- `@claw/shared-rabbitmq`
- `@claw/shared-types`
- `@claw/shared-utilities`

## Data models

- `Connector`
- `ConnectorHealthEvent`
- `ConnectorModel`
- `ModelSyncRun`

## HTTP API

| Method | Route | Source |
|---|---|---|
| `GET` | `/connectors` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| `POST` | `/connectors` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| `DELETE` | `/connectors/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| `GET` | `/connectors/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| `GET` | `/connectors/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| `PATCH` | `/connectors/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| `GET` | `/connectors/:id/models` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| `POST` | `/connectors/:id/models/:modelKey/probe-tools` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| `PUT` | `/connectors/:id/models/exposure` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| `POST` | `/connectors/:id/sync` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| `POST` | `/connectors/:id/test` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| `GET` | `/connectors/available-models` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| `GET` | `/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/health/controllers/health.controller.ts) |
| `GET` | `/internal/connectors/config` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors-internal.controller.ts) |
| `GET` | `/internal/connectors/health-snapshot` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors-internal.controller.ts) |
| `GET` | `/internal/connectors/models-snapshot` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors-internal.controller.ts) |
| `POST` | `/internal/connectors/models/validate-exposed` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors-internal.controller.ts) |
| `GET` | `/internal/connectors/payg-policy` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors-internal.controller.ts) |
| `GET` | `/internal/connectors/public-catalog` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/public-model-catalog.controller.ts) |

## Events produced

| Pattern | Consumers |
|---|---|
| `connector.created` | `claw-audit-service` |
| `connector.deleted` | `claw-audit-service` |
| `connector.health_checked` | `claw-audit-service`, `claw-routing-service` |
| `connector.model_exposure_changed` | `claw-chat-service` |
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
- [Workspace AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/AGENTS.md) for generated, service-local agent context.
