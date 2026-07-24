# Testing Strategy

How ClawAI decides what to test and how much. Grounded in the monorepo's layering
(controller→service→repository/manager; page→controller-hook→service→repository) and
the retained runner matrix (Jest / Vitest / Playwright).

## The test pyramid, applied here

```
        ┌─────────────┐
        │  Playwright │  few — critical user journeys, cross-service truth
        ├─────────────┤
        │ Integration │  some — service + its DB + mocked boundaries; consumer↔publisher
        ├─────────────┤
        │    Unit     │  many — pure logic, DTOs, mappers, hooks, utilities
        └─────────────┘
```

Most assertions live in fast unit tests. Integration tests cover the seams a unit test
can't see (DB behavior, event handling, HTTP boundary). A thin E2E layer proves the
user-visible journey and catches render-time defects that green gates miss.

## Risk-based design (and the quota anti-pattern)

**Design tests from risk, not from a target number.** For each unit, enumerate:

- the happy path,
- each boundary (min/max length, empty, zero, overflow),
- each error branch (validation failure, not-found, forbidden, downstream failure),
- each authorization/ownership decision,
- null / empty / malformed / duplicate / concurrent inputs where applicable.

Write **one clear test per behavior**. Stop when every behavior on the risk surface is
pinned and coverage thresholds are met — not when a headcount is reached.

> **Anti-pattern (explicitly rejected):** "write 20–25 API variations per endpoint."
> Fixed quotas reward near-duplicate happy-path padding and let a genuinely dangerous
> branch slip because it was "one more" past the count. Coverage of _risk_, verified by
> branch analysis, is the bar — not a number of test cases. See
> [`../memory/testing-strategy.md`](../memory/testing-strategy.md).

## TDD flow (default)

1. **Red** — write the failing test that describes the desired behavior.
2. **Green** — write the minimum implementation to pass.
3. **Refactor** — clean up with the test as a safety net.

Every utility, classifier, normalizer, mapper, manager, service, repository, hook, and
component gets a co-located test in `__tests__/`. A feature is not built until its tests
run and pass.

## Defense in depth

Each layer catches a different bug class, and several real defects passed unit gates and
were only caught later (raw i18n keys rendering; FE/BE field-name drift). Therefore:

- Boundary features (FE↔BE, service↔service) get **contract** coverage
  ([contract-testing-standard](contract-testing-standard.md)).
- Stringly-typed runtime lookups get an explicit assertion or a **render** check.
- Cross-service flows get an **integration**/E2E check that asserts DB + log truth, not
  just the HTTP response.

## Determinism

Tests must be deterministic across dev, CI, and containers. Pin locale/time where
behavior depends on them (`localeCompare` is locale-sensitive — see
[flaky-test-policy](flaky-test-policy.md)); mock only at boundaries (DB, HTTP,
RabbitMQ, Ollama, ClamAV); never mock the unit under test.

## Related

- [Coverage policy](coverage-policy.md) · [Quality gates](quality-gates.md) ·
  [Unit testing](unit-testing-standard.md) ·
  [`../memory/testing-strategy.md`](../memory/testing-strategy.md)
