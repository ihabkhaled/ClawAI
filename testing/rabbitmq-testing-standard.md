# RabbitMQ Testing Standard

How to test publishers and consumers on the `claw.events` topic exchange (durable,
DLQ + 3 retries with backoff). The event bus is the async backbone; an untested handler
is a silent failure waiting to hang a downstream poller.

## Publisher tests

- Assert the service **publishes the right pattern with the right payload** on the right
  side effect (e.g. chat publishes `message.completed` after storing the assistant
  message).
- Assert the payload validates against its `shared-types` schema (a publisher emitting a
  shape its own contract rejects is a bug).
- Assert publishing is not on the critical response path where it must be fire-and-forget
  — and that a publish failure is logged, not swallowed.

## Consumer tests

- **Validate the payload on consume.** Event payloads are untrusted at the consumer
  regardless of publisher. Test: valid payload → handled; each malformed variant →
  rejected by the validator (pure critical logic, **100% branch coverage**), not by a
  downstream crash.
- **Idempotency / at-least-once.** DLQ + retries mean a handler can run twice. Test the
  **double-delivery** case: the side effect is idempotent (upsert/dedup/unique-constraint
  guard), state is not corrupted. See
  [`../memory/rabbitmq-lessons.md`](../memory/rabbitmq-lessons.md).
- **Terminal-failure record.** When handling fails terminally, assert a user-visible
  record is persisted so no poller waits forever (the polling-forever pitfall), and the
  error is logged.
- **Retry vs. DLQ.** Assert a transient failure is retried and a poison message ends in
  the DLQ rather than looping.

## What to mock

- Mock the broker transport; invoke the handler directly with a constructed, validated
  payload. You are testing _handler behavior and payload validation_, not RabbitMQ
  itself.
- Real broker wiring (exchange bind, DLQ config) is verified once at the system level,
  not per handler.

## Cross-service event flows

For a multi-hop flow (e.g. `message.completed` → audit + memory), assert each consumer's
observable effect independently (DB write in that service, audit entry) rather than
standing up the whole mesh. Contract-test the payload shape both sides share
([contract-testing-standard](contract-testing-standard.md)).

## Anti-patterns

- Handler with no payload validation ("the publisher's type guarantees it" — it does
  not at runtime).
- Handler that swallows errors (breaks a downstream loop invisibly).
- Non-idempotent side effect with no double-delivery test.

## Related

- [Contract testing](contract-testing-standard.md) · [Integration testing](integration-testing-standard.md) ·
  [`../memory/rabbitmq-lessons.md`](../memory/rabbitmq-lessons.md)
