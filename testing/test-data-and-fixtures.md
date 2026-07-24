# Test Data & Fixtures

How to build the data tests run against, so tests stay deterministic, isolated, and
honest about edge cases.

## Principles

1. **Deterministic.** No ambient clock/locale/random. Freeze time, pin locale, seed any
   randomness. A fixture that changes with the host is a flake source
   ([flaky-test-policy](flaky-test-policy.md)).
2. **Isolated.** Each test owns and cleans its data (transaction rollback, truncate, or
   per-test namespace). No test depends on another's leftovers or on ordering.
3. **Idempotent.** Re-running a suite or a QA script must not accumulate rows or fail on
   the second pass. Prefer upsert-on-natural-key over blind insert.
4. **Realistic + adversarial.** Fixtures cover the happy shape AND the nasty shapes —
   empty, max-length, over-limit, null, malformed, duplicate, unicode/RTL, injection-ish.

## Fixture layers

| Layer          | Source of data                                                                |
| -------------- | ----------------------------------------------------------------------------- |
| Unit           | In-test literals / factory functions; boundaries mocked                       |
| Integration    | Test DB seeded per test; own module wiring real                               |
| E2E (backend)  | Admin JWT via login; data created through the API and cleaned up              |
| E2E (frontend) | Seeded via API before the journey; UI-visible states set up deterministically |

## Seed data

- Reuse the platform seeds where they exist (admin user `admin@claw.local`, default
  policies, model catalog) rather than hand-rolling parallel data.
- Negative-path data is a first-class fixture set: an EICAR file for antivirus, a
  path-traversal filename, an over-nested ZIP, an over-length string, a `.strict()`-
  violating body, a malformed event payload. See
  [security-testing-standard](security-testing-standard.md).

## Secrets in fixtures

- Never use real credentials. Use obviously-fake tokens/keys.
- When asserting non-leakage, the fixture must include a secret-bearing field so the test
  can prove it is stripped from the API and redacted in logs
  ([`../memory/observability-lessons.md`](../memory/observability-lessons.md)).

## Cross-service fixtures

Because each service owns its DB, a cross-service test seeds each service's own store (or
mocks the other service's HTTP/event boundary) — never a shared table. Contract fixtures
are a representative real payload shared by both sides
([contract-testing-standard](contract-testing-standard.md)).

## Factories over fixtures-files where possible

Prefer small factory functions with sensible defaults + per-test overrides over large
static JSON blobs — they make the _relevant_ field of each test obvious and keep fixtures
from rotting.

## Related

- [Flaky test policy](flaky-test-policy.md) · [Database testing](database-testing-standard.md) ·
  [Security testing](security-testing-standard.md)
