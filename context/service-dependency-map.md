# Service Dependency Map

How services reach each other. There are three channels — **shared packages**
(compile-time), **RabbitMQ events** (async), and **HTTP internal endpoints**
(sync). Ground truth: `.ai/manifests/workspace-dependency-graph.json` (package
edges), `event-graph.json` (event edges), `api-endpoints.json` (`/internal/*`
endpoints). **No service touches another service's database** — these three
channels are the only legal cross-service paths.

## 1. Shared-package edges (compile-time)

Every service imports `@claw/shared-constants`, `@claw/shared-types`,
`@claw/shared-utilities`. Additions:

- **`@claw/shared-rabbitmq`** — all services except `health`.
- **`@claw/shared-entitlements`** — audit, chat, connector, file, llamacpp,
  memory, ollama, research, routing, server-logs, workspace.
- **`@claw/shared-auth`** — only agent, research, workspace.
- **`health`** — depends on `@claw/shared-utilities` **only**.

Package-to-package: `shared-auth`, `shared-entitlements` → `shared-types`;
`shared-rabbitmq`, `shared-utilities` → `shared-constants` + `shared-types`;
`shared-types` and `shared-constants` are leaves.

## 2. Event edges (async, via `claw.events`)

Selected producer → consumer flows (full graph in
[event-flow-map.md](event-flow-map.md)):

```
chat    --message.created-->     routing
routing --message.routed-->      chat
chat    --message.completed-->   routing, memory, audit
connector --connector.synced-->  routing, audit
connector --connector.health_checked--> routing, audit
ollama  --connector.synced/updated--> routing, audit
llamacpp --llamacpp.model.loaded/unloaded/crashed--> routing, audit
auth    --user.login/logout-->   audit
memory  --memory.extracted-->    audit
workspace --workspace.sync.*/ai_action.*--> audit
agent   --agent.capability.*-->  audit
ALL(16) --log.server-->          server-logs
```

**`audit-service` is the universal sink.** **`routing-service` is the main
runtime consumer** (message + connector + model lifecycle). **`chat-service`
consumes `message.routed`** to continue execution.

## 3. HTTP internal edges (sync, `/internal/*`)

Services expose `/internal/*` endpoints (service-token protected) for
synchronous data other services need at request time:

| Caller    | Callee           | Endpoint (purpose)                                                 |
| --------- | ---------------- | ------------------------------------------------------------------ |
| chat      | memory           | `/internal/memories/retrieve` (retrieval bundle)                   |
| chat      | memory           | context-pack items for assembly                                    |
| chat      | file             | `/internal/files/:id/content`, `/chunks` (attachments)             |
| chat      | connector        | `/internal/connectors/config`, `/models-snapshot`                  |
| chat      | auth             | `/internal/quota/reserve`/`finalize`/`release`                     |
| image     | file             | `/internal/files/store-image`                                      |
| routing   | connector        | `/internal/connectors/models-snapshot`                             |
| routing   | llamacpp         | `/internal/llamacpp/loaded-snapshot`                               |
| routing   | ollama           | installed models (dynamic router prompt)                           |
| workspace | chat             | `/internal/chat/generate`, `/internal/chat/threads/seeded`         |
| workspace | file-gen / image | `/internal/file-generations/generate`, `/internal/images/generate` |
| agent     | chat             | `/internal/agent/terminal/seed-command`                            |
| health    | all              | `/health` aggregation                                              |

Internal endpoints are discovered in `.ai/manifests/api-endpoints.json` (routes
starting `/internal/`). Inter-service base URLs come from `*_SERVICE_URL` env
vars (see [environment-ownership-map.md](environment-ownership-map.md)); TLS
between hops is verified against the local CA.

## Design rule when adding a cross-service call

1. Is it a **fact the caller needs synchronously**? → internal HTTP endpoint on
   the owner, service-token guarded.
2. Is it a **notification / fan-out**? → publish an event; let consumers react.
3. Is it a **type/value/function** both sides share? → a shared package.
4. Never reach into another DB. Never duplicate a shared utility per service
   (extend-don't-parallelize).
