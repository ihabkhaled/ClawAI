---
name: add-rabbitmq-event
summary: Declare a new event pattern in shared-types, publish it from the service layer, and register consumers.
task_keywords:
  [
    rabbitmq event,
    publish event,
    event pattern,
    claw.events,
    topic exchange,
    shared-types events,
    rabbitmqservice,
    emit event,
    event bus,
    dlq,
  ]
applies_to: [backend, packages/shared-types, apps/claw-<service>-service]
required_rules: [02-backend-rules, 05-infra-rules]
required_context: [event-bus, ai-context-pack]
affected_workspaces: [packages/shared-types, apps/claw-<service>-service, apps/claw-audit-service]
required_tests: [service spec asserting publish after persistence, consumer spec]
required_docs: [docs/03-architecture/event-bus.md, CLAUDE.md]
validation_lane: cd packages/shared-types && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Add a RabbitMQ Event

Events flow through the durable topic exchange `claw.events` (DLQ + 3 retries with backoff). Patterns are declared in `packages/shared-types`, published from the service layer via `RabbitMQService`, and consumed with `@EventPattern`. audit-service consumes most events.

## When to use

- A domain state change should notify other services (created/updated/deleted, completed, health-checked, synced, etc.).
- You need an auditable side-effect trail without a synchronous HTTP dependency.

## When NOT to use

- The caller needs a response value → use internal HTTP (`*_SERVICE_URL`) instead.
- The data belongs to another service's DB — never write across boundaries; emit an event and let the owner react.

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md).
- [`../rules/02-backend-rules.md`](../rules/02-backend-rules.md) — Event Publishing Rules.
- [`../docs/03-architecture/event-bus.md`](../docs/03-architecture/event-bus.md).

## Repository discovery steps

1. Read the event definitions in `packages/shared-types/src/events` to match the naming (`<domain>.<action>`, e.g. `connector.synced`).
2. Grep for an existing `RabbitMQService` publish call to copy the pattern + payload shape.
3. Identify consumers (usually audit-service, sometimes routing/chat) and their `@EventPattern` handlers.

## Tests-first plan

- Service spec: assert the event is published AFTER persistence, with a correlation ID in the payload.
- Consumer spec: assert the handler validates and processes the payload (see [`./add-event-consumer.md`](./add-event-consumer.md)).

## Implementation steps

1. Add the pattern constant + payload type to `packages/shared-types/src/events`; rebuild the package.
2. Publish from the SERVICE layer (never controller/manager) via `RabbitMQService` after the DB write commits.
3. Include a correlation/request ID in the payload; keep payloads free of secrets and large bodies.
4. Register the pattern in the consuming service(s) with `@EventPattern` (see [`./add-event-consumer.md`](./add-event-consumer.md)); audit-service almost always consumes.
5. Update the event-bus table in root `CLAUDE.md` and `docs/03-architecture/event-bus.md`.

## Security considerations

- Never put tokens, API keys, passwords, or full message content in event payloads.
- Consumers must validate payloads with a DTO — never trust event data (security-rules Input Validation).
- Correlation IDs enable end-to-end tracing without leaking PII.

## Failure modes

- Publishing from the controller or before persistence → consumers act on uncommitted/rolled-back data.
- Pattern added to shared-types but dist not rebuilt → consumers can't resolve it.
- No consumer registered → the event fires into the void with no audit trail.

## Validation commands

```bash
cd packages/shared-types && npm run typecheck && npm run lint && npm test && npm run build
cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
```

## Documentation updates

- `docs/03-architecture/event-bus.md` and the Event Bus table in root `CLAUDE.md` (publisher + consumers).

## Definition of done

- Pattern declared + built, published after persistence with correlation ID, consumer registered, publish/consume tests green, event tables updated.
