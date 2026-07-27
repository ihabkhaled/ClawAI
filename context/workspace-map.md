# Workspace Map

The npm-workspace inventory. Ground truth: root `package.json`
(`"workspaces": ["packages/*", "apps/*"]`), `.ai/manifests/services.json`,
`.ai/manifests/packages.json`, `.ai/manifests/tests.json`.

**Total workspaces: 25** = 6 shared packages + 18 backend services + 1 frontend.

## Shared packages (`packages/`)

| Package                     | Depends on (internal)          | Owns                                                          |
| --------------------------- | ------------------------------ | ------------------------------------------------------------- |
| `@claw/shared-types`        | —                              | types, enums, event payloads, EventPattern, Permission enum   |
| `@claw/shared-constants`    | —                              | ports, exchange name, API prefix, service names, pagination   |
| `@claw/shared-auth`         | shared-types                   | AuthGuard, RolesGuard, `@Public`, `@Roles`, `@CurrentUser`    |
| `@claw/shared-rabbitmq`     | shared-constants, shared-types | RabbitMQModule, RabbitMQService (retry+DLQ), StructuredLogger |
| `@claw/shared-utilities`    | shared-constants, shared-types | jwt, http-client, crypto, url-safety, retry, time helpers     |
| `@claw/shared-entitlements` | shared-types                   | plan feature gates (`allow*` fields)                          |

Full ownership rules: [package-boundaries.md](package-boundaries.md). Dependency
edges: `.ai/manifests/workspace-dependency-graph.json`.

## Backend services (`apps/`)

| Service                      | Port            | DB       | Test files | Endpoints |
| ---------------------------- | --------------- | -------- | ---------- | --------- |
| claw-auth-service            | 4001            | Postgres | 36         | 45        |
| claw-chat-service            | 4002            | Postgres | 64         | 37        |
| claw-connector-service       | 4003            | Postgres | 16         | 13        |
| claw-routing-service         | 4004            | Postgres | 50         | 63        |
| claw-memory-service          | 4005            | Postgres | 12         | 46        |
| claw-file-service            | 4006            | Postgres | 15         | 14        |
| claw-audit-service           | 4007            | Mongo    | 15         | 7         |
| claw-ollama-service          | 4008            | Postgres | 17         | 34        |
| claw-health-service          | 4009            | none     | 4          | 1         |
| claw-client-logs-service     | 4010 (env-only) | Mongo    | 6          | 5         |
| claw-server-logs-service     | 4011 (env-only) | Mongo    | 7          | 7         |
| claw-image-service           | 4012            | Postgres | 9          | 9         |
| claw-file-generation-service | 4013            | Postgres | 7          | 7         |
| claw-workspace-service       | 4014            | Postgres | 66         | 103       |
| claw-agent-service           | 4015            | Postgres | 9          | 83        |
| claw-research-service        | 4016            | Postgres | 14         | 16        |
| claw-llamacpp-service        | 4017            | Postgres | 16         | 26        |
| claw-payment-service         | 4018            | Postgres | 76         | 26        |

Counts from `.ai/manifests/services.json` + `tests.json`. The
env-only-port note for client-logs/server-logs is expanded in
[port-and-service-map.md](port-and-service-map.md).

## Frontend (`apps/`)

| Workspace     | Runner     | Test files | Pages |
| ------------- | ---------- | ---------- | ----- |
| claw-frontend | **vitest** | 211        | 102   |

## Test totals

678 test files across the monorepo (`.ai/manifests/tests.json`). All backend
services + shared packages use **jest**; the frontend uses **vitest**. See
[testing-map.md](testing-map.md).

## Dependency directionality

- Shared packages depend only on other shared packages (a small DAG:
  types/constants are leaves; auth/entitlements/rabbitmq/utilities depend on
  them).
- Every service depends on `@claw/shared-constants`, `@claw/shared-types`,
  `@claw/shared-utilities`; all except health also use `@claw/shared-rabbitmq`.
- Only `agent`, `payment`, `research`, and `workspace` additionally import `@claw/shared-auth`
  (they run their own auth surface).
- `health-service` is intentionally minimal: it depends **only** on
  `@claw/shared-utilities`.

See [service-dependency-map.md](service-dependency-map.md) for the full edge set.
