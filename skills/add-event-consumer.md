---
name: add-event-consumer
summary: Register an @EventPattern handler that validates payloads, handles errors, and is idempotent.
task_keywords:
  [
    event consumer,
    eventpattern,
    messagepattern,
    consume event,
    subscribe event,
    rabbitmq handler,
    idempotent consumer,
    dlq retry,
    no silent swallow,
  ]
applies_to: [backend, apps/claw-<service>-service/src/modules/<domain>]
required_rules: [02-backend-rules, 05-infra-rules, 08-security-rules]
required_context: [event-bus, ai-context-pack]
affected_workspaces: [apps/claw-<service>-service]
required_tests:
  [consumer spec (valid payload, invalid payload, duplicate/idempotent, handler error)]
required_docs: [docs/03-architecture/event-bus.md]
validation_lane: cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Add an Event Consumer

A consumer subscribes to a `claw.events` pattern with `@EventPattern`/`@MessagePattern`. It validates the payload, acts idempotently, and never swallows errors silently — the exchange provides DLQ + 3 retries with backoff.

## When to use

- A service must react to another service's event (audit logging, cache invalidation, downstream sync).
- Wiring the consumer half of a new event (pair with [`./add-rabbitmq-event.md`](./add-rabbitmq-event.md)).

## When NOT to use

- The reaction needs to return data to the publisher → that is synchronous HTTP, not an event.
- The handler would write into another service's DB — react within your own boundary only.

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md).
- [`../rules/02-backend-rules.md`](../rules/02-backend-rules.md), [`../rules/08-security-rules.md`](../rules/08-security-rules.md) (validate RabbitMQ input).
- [`../docs/03-architecture/event-bus.md`](../docs/03-architecture/event-bus.md).

## Repository discovery steps

1. Read an existing `@EventPattern` handler in the service (audit-service has many) for the controller/handler placement and ack behaviour.
2. Confirm the pattern constant + payload type exist in `packages/shared-types`.
3. Check the `RabbitMQModule` wiring for DLQ/retry config.

## Tests-first plan

- Consumer spec: valid payload processes; invalid payload is rejected/logged (not blindly processed); the same event delivered twice produces one effect (idempotent); a handler dependency throwing logs an error and lets retry/DLQ take over.

## Implementation steps

1. Add the handler method with `@EventPattern(<PATTERN>)` in the module's controller/consumer class.
2. Validate the payload with a Zod DTO immediately — never trust event data.
3. Make the effect idempotent: check for an existing record / use an idempotency key before writing, so retries don't double-apply.
4. Log per the logging rule: `debug` on receipt, `info` on the side effect, `error` in catch.
5. On failure, log and rethrow so the exchange retries and eventually DLQs — do NOT swallow. For user-visible flows, also store an error record.
6. Extract inline types/enums per the no-inline rule.

## Security considerations

- Payload validation at the consumer boundary is mandatory (security-rules: never trust RabbitMQ data).
- Do not log secrets that might ride in a payload; redaction-safe stringify only.
- Reacting only within your own DB preserves data ownership.

## Failure modes

- Swallowing the error → the message acks and the failure is lost with no DLQ trail.
- Non-idempotent handler → retries create duplicate rows/side effects.
- Skipping payload validation → malformed/malicious data reaches persistence.

## Validation commands

```bash
cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
```

Verify end-to-end by publishing a test event and checking the consumer's DB + logs (no `UnhandledPromiseRejection`).

## Documentation updates

- Add the consumer to the event-bus table (`docs/03-architecture/event-bus.md` and root `CLAUDE.md`).

## Definition of done

- Handler registered, payload validated, idempotent, errors rethrow to DLQ, consumer tests green, event tables updated.
