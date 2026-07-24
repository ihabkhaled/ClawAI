---
name: trace-event-end-to-end
summary: Trace a RabbitMQ event — pattern in shared-types → publisher (RabbitMQService in a service) → claw.events exchange → @EventPattern consumer (often audit-service).
task_keywords:
  [
    trace event,
    rabbitmq,
    event bus,
    publisher,
    consumer,
    claw.events,
    EventPattern,
    MessagePattern,
    topic exchange,
    audit,
    DLQ,
    event flow,
    async,
  ]
applies_to: [all-backend-services, shared-types, shared-rabbitmq]
required_rules: [00-master-rules, 02-backend-rules]
required_context: [event-bus, data-ownership, services-index]
affected_workspaces: [none-read-only]
required_tests: [none-read-only]
validation_lane: npm run knowledge:context -- --task="trace <event>" (read-only)
required_docs: [none]
---

## When to use

You need to follow an asynchronous event: which service publishes it, its
payload shape, and which service(s) consume it. Use before adding a consumer,
changing a payload, or debugging why a downstream side effect (audit log, memory
extraction, routing update) did not happen.

## When NOT to use

For a synchronous HTTP path use [`./trace-request-end-to-end.md`](./trace-request-end-to-end.md).
To decide which service _should own_ a new event, use
[`./find-canonical-owner.md`](./find-canonical-owner.md).

## Read first

- [`../docs/03-architecture/event-bus.md`](../docs/03-architecture/event-bus.md) — every producer/consumer
- [`./08-event-bus-toolkit.md`](./08-event-bus-toolkit.md) — publish/consume/DLQ runbook
- [`../docs/03-architecture/data-ownership.md`](../docs/03-architecture/data-ownership.md)

## Repository discovery steps

Event patterns are declared in `packages/shared-types/src/events`. Publishers
call the `shared-rabbitmq` `RabbitMQService` from the **service layer** (never
controllers) and route through the single durable topic exchange `claw.events`
(3 retries + DLQ). Consumers use `@EventPattern`/`@MessagePattern`;
**audit-service consumes most events**. Each service owns its own DB — events
are the cross-boundary mechanism alongside `*_SERVICE_URL` HTTP.

## Tests-first plan

Before concluding the trace is correct, reproduce it: trigger the publisher
action and confirm the publisher log line (e.g. `Published event: <pattern>`)
and the consumer handler log both fire. If nothing lands, verify the pattern
string matches exactly on both sides (a one-char typo silently no-ops) and check
the DLQ per [`./08-event-bus-toolkit.md`](./08-event-bus-toolkit.md).

## Implementation steps

1. **Find the pattern constant:**
   ```bash
   grep -rn "<event.name>\|<EVENT_CONSTANT>" packages/shared-types/src --include="*.ts"
   ```
2. **Find the publisher:**
   ```bash
   grep -rn "publish(\|RabbitMQService" apps/ --include="*.service.ts" | grep -i "<event>"
   ```
3. **Read the payload shape** the publisher passes (its typed payload from
   shared-types).
4. **Find the consumer(s):**
   ```bash
   grep -rn "@EventPattern\|@MessagePattern" apps/ --include="*.ts" | grep -i "<event>"
   ```
5. **Read each consumer handler** — usually a service method that writes to that
   service's own DB (audit ledger, memory extraction, routing sync).
6. **Confirm ordering/fan-out** against `docs/03-architecture/event-bus.md`'s
   producer/consumer table.

## Security considerations

Payloads must not carry secrets (tokens, API keys, passwords). Verify the
published payload is scrubbed — event bodies land in audit/log stores. Pino
redaction covers known fields; do not add new secret-bearing fields to a
payload.

## Failure modes

- **Pattern typo** — publisher and consumer strings must be byte-identical; use
  the shared-types constant on both sides, never a literal.
- **Consumer not registered** in its module → handler never binds.
- **Message in DLQ** after 3 retries → consumer threw; inspect the DLQ.
- **Wrong service owning the write** — verify against the data-ownership doc.

## Validation commands

```bash
grep -rn "<event.name>" packages/shared-types/src apps/ --include="*.ts"
grep -rn "@EventPattern" apps/claw-audit-service/src --include="*.ts"
npm run knowledge:context -- --task="trace <event>" --event=<event.name>
```

## Documentation updates

None for tracing. Adding/changing an event means updating
[`../docs/03-architecture/event-bus.md`](../docs/03-architecture/event-bus.md)
and the root `CLAUDE.md` event table.

## Definition of done

You can name the pattern constant, the publisher service+method, the payload
shape, and every consumer service+handler — and you observed the publish and
consume log lines when you triggered it.
