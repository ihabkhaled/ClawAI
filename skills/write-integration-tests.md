---
name: write-integration-tests
summary: Test cross-module/cross-service wiring with real modules and mocked external boundaries, verifying event producer→consumer contracts.
task_keywords:
  [
    integration test,
    cross-service,
    module wiring,
    event contract,
    producer consumer,
    rabbitmq,
    claw.events,
    mock boundary,
    http inter-service,
    testing module,
    spec.ts,
  ]
applies_to: [backend, apps/claw-<service>-service, packages/shared-rabbitmq, packages/shared-types]
required_rules: [04-testing-rules, 02-backend-rules, 05-infra-rules]
required_context: [INTEGRATION_TESTING_STANDARD, ai-context-pack]
affected_workspaces: [apps/claw-<service>-service]
required_tests:
  [integration spec (real module wiring, mocked DB/HTTP/RabbitMQ), event contract spec]
required_docs: [docs/03-architecture/event-bus.md, docs/04-backend/service-guide-<service>.md]
validation_lane: cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test -- --coverage && npm run build
---

# Skill: Write Integration Tests

Integration tests wire real NestJS modules together (controller → service → manager → repository) and mock ONLY the external boundaries: the database (Prisma), HTTP inter-service calls, RabbitMQ (`claw.events` topic exchange via shared-rabbitmq), Ollama, and ClamAV. They verify that layers cooperate and that event producer→consumer contracts hold — patterns live in shared-types.

## When to use

- A feature spans multiple modules or multiple services (e.g. `message.completed` → memory extraction + audit).
- Verifying an event publisher and its consumer agree on pattern + payload shape.
- HTTP inter-service call response-shape + error handling.

## When NOT to use

- One method in isolation → [`./write-service-tests.md`](./write-service-tests.md).
- Full flow through nginx with a live stack → [`./write-backend-e2e-tests.md`](./write-backend-e2e-tests.md).

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md).
- [`../rules/04-testing-rules.md`](../rules/04-testing-rules.md) — T5 (integration).
- [`./08-event-bus-toolkit.md`](./08-event-bus-toolkit.md) — event patterns and consumer wiring.
- [`../docs/03-architecture/event-bus.md`](../docs/03-architecture/event-bus.md).

## Repository discovery steps

1. Read the CLAUDE.md Event Bus table for the publisher→consumer pair (e.g. `message.completed` → audit, memory).
2. Confirm the event pattern constant in `packages/shared-types` and the payload type — do not invent a pattern string.
3. Read the consumer's handler to learn the exact payload fields it reads.
4. Read a sibling integration spec for the `Test.createTestingModule` multi-provider setup.

## Tests-first plan

- Producer test: trigger the service path, assert `RabbitMQService.publish` was called with the shared-types pattern and a payload matching the consumer's expected shape.
- Consumer test: feed a valid event payload into the handler with mocked repo/HTTP; assert the side effect (DB write args, downstream publish).
- Contract test: the payload the producer emits parses against the consumer's DTO/type.
- Failure path: consumer boundary rejects → assert retry/DLQ-safe handling, no swallowed error.

## Implementation steps

1. Build a testing module importing the real modules under test; provide jest-mocked Prisma, HTTP client, `RabbitMQService`, Ollama/ClamAV.
2. For a producer: invoke the controller/service entry and capture `publish` args.
3. For a consumer: call the message handler directly with a realistic payload; assert repository/publish side effects by call args.
4. Validate the payload against the shared-types type so a drift in either side fails the test.
5. Cover the failure branch: force the mocked boundary to throw; assert the handler logs and does not silently swallow.
6. Keep external boundaries mocked — this is not an E2E test; no live Docker, no real broker.

## Security considerations

- Never trust event payloads — assert the consumer validates with a DTO (see [`./add-event-consumer.md`](./add-event-consumer.md)).
- Assert cross-service HTTP calls carry the service token and that responses omit sensitive fields.

## Failure modes

- Asserting the producer publishes but never checking the consumer can read that shape → contract drift.
- Using a hand-typed pattern string instead of the shared-types constant.
- Letting a mocked broker "succeed" so a broken handler passes — force the error branch too.
- Turning it into a de-facto E2E by hitting real infra — keep boundaries mocked.

## Validation commands

```bash
cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test -- --coverage && npm run build
```

## Documentation updates

- Update `docs/03-architecture/event-bus.md` if a new event pair is introduced.
- Update the CLAUDE.md Event Bus table for any new publisher/consumer.

## Definition of done

- Producer + consumer + contract + failure-path specs green; only DB/HTTP/RabbitMQ/Ollama/ClamAV mocked; pattern sourced from shared-types; payload validated both sides.
