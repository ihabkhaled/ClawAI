# RabbitMQ Lessons

Durable lessons about the async event bus (`claw.events` topic exchange, durable,
DLQ + 3 retries with backoff). See [README](README.md) for format.

---

### An event handler that swallows an error breaks a downstream loop you can't see (2026-07-24)

**What happened.** When downstream processing triggered by an event failed silently
(no store, no log), the effect surfaced elsewhere — a frontend poll that waits for a
record the failed handler was supposed to produce spins forever.

**The durable lesson.** In an event-driven system, a swallowed error is not local —
it starves a consumer or a poller somewhere else. The blast radius of "log nothing,
store nothing" is a hung UX two hops away.

**How to apply.** Never silently swallow in a RabbitMQ handler. At minimum log AND
persist a user-visible terminal record so downstream waiters can complete. Let the
DLQ + retry policy handle transient failures; handle terminal ones by writing an
error record. See [known-pitfalls](known-pitfalls.md) (polling-forever).

**Related.** `CLAUDE.md` → Phase 5 error handling;
[observability-lessons](observability-lessons.md).

---

### Event payloads are contracts — validate them like external input (2026-07-24)

**What happened.** Consumers assumed the shape a publisher sent. A publisher change
or a malformed payload could break a consumer with a confusing runtime error far from
the source.

**The durable lesson.** The wire between services is untrusted regardless of who
publishes. An event payload deserves the same Zod validation as an HTTP body; the
publisher's type is not a guarantee at the consumer.

**How to apply.** Define event payload types in `packages/shared-types`; validate on
consume. Event validators are pure critical logic → 100% branch coverage. Add new
patterns to `shared-types` and register consumers as part of the same change.

**Related.** [testing/rabbitmq-testing-standard](../testing/rabbitmq-testing-standard.md);
[testing/contract-testing-standard](../testing/contract-testing-standard.md).

---

### Choose sync HTTP vs async event per datum, not per feature (2026-07-24)

**What happened.** Cross-service data needs surfaced repeatedly; defaulting whole
features to one transport caused either tight coupling (everything HTTP) or surprising
staleness (everything eventual).

**The durable lesson.** Synchronous HTTP and async events have different failure and
consistency semantics. The right choice is per datum: "need it now, in this response"
→ HTTP; "can be eventually consistent, fan-out to many" → event.

**How to apply.** In impact analysis, list each cross-service datum and its transport.
Events for fan-out/audit/eventual; HTTP for read-now. Audit is a consumer of nearly
every domain event — publish there rather than calling audit synchronously.

**Related.** ADR-003 rabbitmq-events; [backend-patterns](backend-patterns.md).

---

### Design consumers to tolerate retries — idempotency is not optional (2026-07-24)

**What happened.** With DLQ + 3 retries, a consumer can process the same event more
than once. A non-idempotent side effect (double-write, double-charge) then corrupts
state.

**The durable lesson.** At-least-once delivery means "handle this twice" is a normal
case, not an edge case. Any side effect that isn't idempotent is a latent duplication
bug waiting for the first retry.

**How to apply.** Make consumer side effects idempotent (upsert on a natural key,
dedup check before insert, check-then-act guarded by a unique constraint). Test the
double-delivery case explicitly.

**Related.** `CLAUDE.md` → mindset 15 idempotency;
[database-lessons](database-lessons.md).
