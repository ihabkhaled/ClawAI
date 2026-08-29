# Event Flow Map

The RabbitMQ event model. Ground truth: `.ai/manifests/event-graph.json`
(producers/consumers, heuristically inferred — verify in code) and
`rabbitmq-events.json`. Contract source: the `EventPattern` union in
`@claw/shared-types`.

## The bus

- **One durable topic exchange: `claw.events`**, with a **DLQ + 3 retries with
  backoff**, provided by `@claw/shared-rabbitmq`.
- **165 event patterns** are registered (`.ai/BOOTSTRAP.md`). Routing keys are
  dotted (`message.routed`, `connector.synced`, `workspace.sync.run_completed`).
- Adding an event: **add the pattern to `@claw/shared-types` first**, then
  publish in the producing service (in a service/manager, never a controller),
  then add a non-swallowing consumer. **Every producer needs a documented
  consumer.**

## The two hubs

- **`audit-service` — the universal sink.** It consumes nearly every lifecycle
  event: `user.login/logout`, `connector.*`, `file.*`, `memory.extracted`,
  `routing.*`, `llamacpp.*`, `agent.capability.*`, `ai_action.*`,
  `workspace.sync.*`, `workspace_action.*`, `message.completed`.
- **`routing-service` — the runtime consumer.** It consumes signals that change
  routing: `message.created`, `message.completed`, `connector.synced`,
  `connector.health_checked`, `model.pulled`, `model.deleted`,
  `llamacpp.model.loaded/unloaded/crashed`, and routing profile / circuit-breaker
  events. It publishes `message.routed` back to `chat-service`.

## Core runtime chain

```
chat  --message.created-->      routing
routing --message.routed-->     chat
chat  --message.completed-->    routing, memory, audit
```

## Fan-in / fan-out highlights

| Producer(s)                    | Event(s)                                                                                                                            | Consumer(s)       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| connector, ollama              | `connector.synced`, `connector.updated`                                                                                             | routing, audit    |
| connector                      | `connector.health_checked`                                                                                                          | routing, audit    |
| llamacpp                       | `llamacpp.model.loaded/unloaded/crashed`                                                                                            | routing, audit    |
| memory                         | `memory.extracted/suggested/approved/rejected/redacted/forgotten`                                                                   | audit (extracted) |
| auth                           | `user.login/logout`                                                                                                                 | audit             |
| payment                        | `billing.subscription.*`, `billing.payment.*`, `billing.invoice.*`, `billing.refund.*`, `billing.entitlement.*`                     | auth, audit       |
| agent                          | `agent.capability.*` (12), `agent.session_*`, `agent.device_*`, `agent.token_*`                                                     | audit             |
| workspace                      | `workspace.sync.*`, `workspace_action.*`, `ai_action.*`, `workspace_connector.*`, `workspace.webhook.*`, `workspace.auto_suggest.*` | audit             |
| file                           | `file.uploaded/chunked/deleted/failed`, `file.ocr_*`, `file.retention_expired`, `file.archive_expanded`                             | audit             |
| **all 17 non-health services** | **`log.server`**                                                                                                                    | **server-logs**   |

## `log.server` (the logging pipeline)

Every service's Pino logger publishes `log.server`; `server-logs-service`
persists to MongoDB (TTL 30 days). This is automatic plumbing — no per-service
wiring. Producers of `log.server` per the graph: agent, audit, auth, chat,
client-logs, connector, file, file-generation, image, llamacpp, memory, ollama,
payment, research, routing, server-logs, workspace (17 total).

## Declared-but-not-yet-wired

Some patterns exist in the contract with producers but no durable consumer yet
(e.g. several `context_pack.*`, `memory.*`, the 12 `runtime.progress.*`
patterns). The `runtime.progress.*` family flows over **in-process SSE today**;
durable RabbitMQ publishing of those is on the backlog (`CLAUDE.md` runtime
-progress notes). The `event-graph.json` `consumers: []` entries flag exactly
these.

## Rules

- Handlers must **never swallow errors silently** — log and let retry/DLQ do its
  job.
- Publish from services/managers, not controllers.
- The pattern lives in `@claw/shared-types` before any producer/consumer code.
- Validation lane for event changes:
  `cd packages/shared-types && npm run typecheck` then `npm run affected:test`
  (the rabbitmq-event pack in [task-router.md](task-router.md)).

## PAYG connector credit (ADR-078)

| Pattern                          | Producer → Consumer | Why it exists                                                                                                                  |
| -------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `billing.credit.topup_succeeded` | payment → auth      | Money in. Enqueued in the SAME transaction as the charge; auth grants via the existing inbox, keyed on the envelope `eventId`. |
| `billing.credit.topup_reversed`  | payment → auth      | Refund or chargeback. Auth clamps to the UNSPENT purchased balance; the wallet never goes negative.                            |
| `credit.balance.low`             | auth → audit        | 80% / 95% thresholds, each also carrying an absolute floor.                                                                    |
| `credit.balance.exhausted`       | auth → audit        |                                                                                                                                |
| `credit.grant.renewed`           | auth → audit        | Period roll: grant reset, unused grant swept.                                                                                  |
| `routing.model_cost.published`   | routing → auth      | Busts auth's 300 s rate cache so an admin repricing applies on the next request, not at the end of the TTL.                    |

**Boot order is load-bearing.** `RabbitMQService.publish` does not set
`mandatory`, and queues are asserted by the CONSUMER at boot. If payment drains
a credit event before auth has ever subscribed, the broker discards it, the
outbox row is marked PUBLISHED, and **no DLQ receives anything** — the money is
taken and no credit is granted. **auth-service must be healthy before
payment-service starts.** See `docs/11-runbooks/runbook-payg-credit.md`.
