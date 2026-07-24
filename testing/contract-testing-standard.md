# Contract Testing Standard

Tests that pin the shape of data crossing a boundary — FE↔BE HTTP payloads, service↔
service internal HTTP, and RabbitMQ event payloads. This is the layer that catches the
drift green typecheck cannot.

## Why ClawAI needs this specifically

At a boundary, the field name _is_ the contract. A FE type that renamed `createdAt` →
`receivedAt` typechecked fine and shipped `Invalid Date` because the wire never carried
`receivedAt`. See [`../memory/known-pitfalls.md`](../memory/known-pitfalls.md). Internal
type-consistency proves nothing across a boundary; only a contract test does.

## Three contracts to cover

### 1. FE ↔ BE HTTP

- The BE DTO (Zod) is the source of truth. FE types **mirror BE DTO/Prisma field names
  verbatim**.
- Assert the FE decodes a representative real payload without dropping fields.
- When the BE schema is `.strict()`, assert the FE request body is the **exact**
  accepted-key set — a superset field 400s the whole request. Test the rejection.

### 2. Service ↔ service internal HTTP

- Internal endpoints (context assembly pulling memories/pack items/file chunks;
  health aggregation) have a stable request/response shape.
- Pin the shape both sides agree on; a change on one side must fail the other's contract
  test, not surface as a runtime 500.

### 3. RabbitMQ event payloads

- Event payload types live in `packages/shared-types`. The **event validator is pure
  critical logic → 100% branch coverage** ([coverage-policy](coverage-policy.md)).
- Assert: a valid payload passes; each malformed variant (missing field, wrong type,
  over-limit) is rejected by the consumer's validator, not by a downstream crash.

## Keeping contracts honest

- Share the schema, don't re-declare it: prefer importing the `shared-types` type / Zod
  schema on both sides over hand-copying a shape.
- A contract change is a coordinated change: BE DTO + FE type + any event payload type +
  the tests, in the same change set.
- Version or dual-write when a contract must evolve without a flag-day (the
  `file_delivery_records` dual-write window, ADR-054, is the pattern).

## What a contract test is NOT

It is not a full integration test — it does not need a live DB or broker. It asserts the
_shape agreement_, cheaply and deterministically, so drift fails fast in the fastest
gate that can see it.

## Related

- [Integration testing](integration-testing-standard.md) · [RabbitMQ testing](rabbitmq-testing-standard.md) ·
  [`../memory/backend-patterns.md`](../memory/backend-patterns.md) ·
  [`../memory/frontend-patterns.md`](../memory/frontend-patterns.md)
