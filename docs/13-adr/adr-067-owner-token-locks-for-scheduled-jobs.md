# ADR-067: Owner-token Redis locks for scheduled jobs

**Status**: Accepted

**Date**: 2026-07-27

**Deciders**: ClawAI core team
**Slice**: Subscription completion

## Context

Every application replica registers the same NestJS cron and interval handlers.
A process-local guard therefore cannot prevent duplicate reconciliation,
lifecycle, invoice-delivery, or outbox work. A plain Redis `DEL` is also unsafe:
after a lease expires, the former owner could delete a newer owner's lock.

The jobs must remain resumable after a replica exits between database commits.

## Decision

- Every scheduled payment job runs through `ScheduledJobRunnerService`.
- Acquisition uses Redis `SET key owner NX EX ttl`.
- The owner is a fresh cryptographically random token for each attempt.
- Release uses one atomic Lua compare-and-delete operation.
- Release is attempted in `finally`; lock contention records a safe skip.
- Each job defines a constant TTL longer than its documented worst-case batch
  duration.
- Jobs process bounded batches, persist progress, and make replay harmless.
  A lock coordinates owners; it is not a substitute for idempotency.
- Lock acquisition, callback, and release failures are logged without customer
  data or secrets. Release failure does not hide the original job failure.

## Consequences

- Only one replica owns a job batch at a time.
- A crashed replica stops blocking work when the TTL expires.
- A slow former owner cannot delete a successor's lock.
- A job that can exceed its TTL must reduce its batch or add a separately
  designed renewal protocol; silently relying on a longer run is invalid.

## Alternatives considered

- **Process-local boolean.** Rejected because replicas do not share memory.
- **Database advisory locks.** Rejected for this foundation because all payment
  jobs already depend on Redis and the shared owner-token primitive is simpler
  to test across modules.
- **Unconditional Redis `DEL`.** Rejected because it permits stale-owner unlock.
- **Lock without durable progress.** Rejected because a crash would restart an
  unbounded batch with ambiguous side effects.

## Validation

Tests cover acquisition, contention, owner-token reuse for release, callback
failure, owner mismatch, and Redis failures. Each job separately tests bounded
and idempotent replay behavior.

## Rollback

Disable the affected schedules rather than restoring unlocked execution. Manual
one-shot operations must use the same runner until a replacement coordination
strategy is accepted.
