# 17 — RabbitMQ Events and Jobs

## Purpose

Async cross-service communication runs on one topic exchange with one reliability
contract. Events decouple producers from consumers; getting the publish point,
payload typing, and retry/DLQ handling right is what keeps the bus trustworthy.

## Applies to

All services that publish or consume events, `@claw/shared-rabbitmq`,
`@claw/shared-types` (event payloads/patterns).

## Mandatory rules

1. **One exchange:** `claw.events` (topic, durable), with **DLQ + 3 retries with
   backoff** configured in `RabbitMQModule` from `@claw/shared-rabbitmq`.
2. **Publish from the service layer, after persistence** — never from a controller,
   repository, or before the write commits (see [09](09-backend-services.md)).
3. **Event patterns and payload types are declared in `@claw/shared-types`.** Both
   publisher and consumer import the same pattern constant and payload type — no
   ad-hoc string patterns.
4. **Include a correlation/request ID** in every payload so a flow is traceable
   end-to-end across services.
5. **Consumers never swallow failures.** On a handler error, at minimum log and
   store a user-visible error record; let the retry/DLQ machinery do its job — do
   not `catch {}` into silence.
6. **Audit is the common consumer.** Domain events (memory._, connector._,
   workspace.sync._, agent.capability._, llamacpp.*, etc.) are consumed by
   `audit-service`; wire new events into it.
7. **Runtime-progress note:** the 12 `runtime.progress.*` patterns are declared but
   currently delivered over in-process SSE, not durably on RabbitMQ. Don't assume
   durable delivery for those until the backlog item ships.

## Prohibited patterns

- Publishing an event from a controller or before the DB write.
- A raw string event pattern instead of the shared-types constant.
- A consumer `catch` block that logs nothing and stores nothing.
- Adding a domain event without an audit-service consumer.

## Correct pattern

```ts
// service layer, after persistence
import { CONNECTOR_SYNCED } from '@claw/shared-types';
await this.connectorRepo.markSynced(id);
await this.events.publish(CONNECTOR_SYNCED, { connectorId: id, requestId }); // audit + routing consume
```

## Enforcement

- **Knowledge check** — `.ai/manifests/{rabbitmq-events,event-graph}.json` +
  `knowledge:verify` flag undeclared/orphaned patterns.
- **Unit test** — publish-after-persist and consumer error handling asserted.
- **Review checklist** — new events confirmed wired to their consumers.

## Related skills

- [08-event-bus-toolkit](../skills/08-event-bus-toolkit.md)

## Related context

- Root `CLAUDE.md` — "Event Bus (RabbitMQ)" table, "Message Flow (End-to-End)".

## Definition of done

- [ ] Event pattern + payload type in `@claw/shared-types`, used by both ends.
- [ ] Published from the service after persistence, with a correlation ID.
- [ ] Consumers handle errors (log + store); new events wired into audit.
