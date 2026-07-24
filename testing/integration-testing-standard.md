# Integration Testing Standard

Tests that exercise a unit together with a real boundary a unit test mocks — a service
plus its database, a controller plus its guards/pipes, or a consumer plus a real
publish. Backend: **Jest**. Scope is one service (its DB, its module wiring); genuinely
external services stay mocked or are covered by [contract testing](contract-testing-standard.md).

## When to write one

- A flow crosses the controller→service→repository layers and the wiring itself can
  break (guards, pipes, exception filter, DTO validation).
- Persistence behavior matters (transactions, cascade deletes, unique constraints,
  pagination bounds) — a mocked repository can't prove these.
- A RabbitMQ consumer's handler must run against a validated payload and produce a DB
  write — see [rabbitmq-testing-standard](rabbitmq-testing-standard.md).

## What to assert

- **The full request lifecycle:** DTO validation rejects bad input with the right code;
  the guard denies unauthorized callers; the service enforces ownership; the repository
  persists the expected row.
- **DB truth, not the response body.** After a write, read the store back and assert the
  row (count, encrypted-secret column present, status transition). A 2xx is not proof —
  see [`../memory/database-lessons.md`](../memory/database-lessons.md).
- **Error propagation:** downstream failure produces a `BusinessException` with a stable
  `code`, is logged, and (on a terminal async failure) persists a user-visible record so
  no poller hangs — see [`../memory/known-pitfalls.md`](../memory/known-pitfalls.md).

## Boundaries

| Boundary                          | In an integration test                                                       |
| --------------------------------- | ---------------------------------------------------------------------------- |
| Own PostgreSQL/Mongo              | Real (test DB or ephemeral container)                                        |
| Own module wiring                 | Real (Nest testing module)                                                   |
| Another ClawAI service (HTTP)     | Mocked; covered by contract tests                                            |
| RabbitMQ                          | Real handler invocation with a validated payload; broker mocked or in-memory |
| Ollama / ClamAV / cloud providers | Mocked                                                                       |

## Cross-service flows

A feature spanning services (e.g. message → routing → chat → memory/audit) is verified
by asserting each hop's observable effect: event published (log line), event consumed
(consumer effect), DB record in the owning service's DB, audit entry recorded. Do not
try to stand up all 17 services in one test — assert per-seam. End-to-end user truth is
the E2E layer's job.

## Determinism

Use a clean DB state per test (transaction rollback or truncate). Pin locale/time. Never
depend on test ordering. Correlation IDs (`X-Request-ID`) should be assertable in logs.

## Related

- [Backend E2E](backend-e2e-standard.md) · [Database testing](database-testing-standard.md) ·
  [RabbitMQ testing](rabbitmq-testing-standard.md) ·
  [`../memory/rabbitmq-lessons.md`](../memory/rabbitmq-lessons.md)
