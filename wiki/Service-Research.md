# Research Service

**Workspace:** [`apps/claw-research-service`](https://github.com/ihabkhaled/ClawAI/tree/main/apps/claw-research-service)  
**Port:** 4016  
**Database:** postgresql  
**Test runner:** vitest · **31 test files**  
**API endpoints:** 17

## Responsibilities and boundaries

This page is generated from the current machine-readable service, API, event, and test manifests. The service owns its process and persistence boundary; cross-service work must use explicit HTTP contracts or RabbitMQ events rather than reaching into another service's database.

## Internal dependencies

- `@claw/shared-auth`
- `@claw/shared-constants`
- `@claw/shared-entitlements`
- `@claw/shared-rabbitmq`
- `@claw/shared-types`
- `@claw/shared-utilities`

## Data models

- `FetchJob`
- `PageCache`
- `ResearchRun`
- `SearchProvider`
- `SearchRun`

## HTTP API

| Method | Route | Source |
|---|---|---|
| `GET` | `/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/health/health.controller.ts) |
| `POST` | `/internal/research/runs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/controllers/research-internal.controller.ts) |
| `POST` | `/research/fetch` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/controllers/fetch.controller.ts) |
| `GET` | `/research/fetch/jobs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/controllers/fetch.controller.ts) |
| `GET` | `/research/fetch/jobs/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/controllers/fetch.controller.ts) |
| `GET` | `/research/runs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/controllers/research.controller.ts) |
| `POST` | `/research/runs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/controllers/research.controller.ts) |
| `GET` | `/research/runs/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/controllers/research.controller.ts) |
| `POST` | `/research/search` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search.controller.ts) |
| `GET` | `/research/search-providers` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search-provider.controller.ts) |
| `POST` | `/research/search-providers` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search-provider.controller.ts) |
| `DELETE` | `/research/search-providers/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search-provider.controller.ts) |
| `GET` | `/research/search-providers/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search-provider.controller.ts) |
| `PATCH` | `/research/search-providers/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search-provider.controller.ts) |
| `POST` | `/research/search-providers/:id/test` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search-provider.controller.ts) |
| `GET` | `/research/search/runs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search.controller.ts) |
| `GET` | `/research/search/runs/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search.controller.ts) |

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
- [Workspace AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/AGENTS.md) for generated, service-local agent context.
