---
name: write-backend-e2e-tests
summary: Boot a real NestJS application and exercise it over HTTP (Supertest) for auth, authorization, validation, and error-path coverage.
task_keywords: [e2e, backend e2e, supertest, http test, integration test, boot app, end to end]
applies_to: [nestjs-service]
required_rules: [22-testing-and-coverage, 16-authentication-and-authorization]
required_context: [testing-map, backend-architecture]
affected_workspaces: [the service under test]
required_tests: [backend-e2e]
required_docs: [none]
validation_lane: cd apps/<service> && npm test
---

## When to use

For any endpoint whose correctness depends on the full request pipeline —
guards, interceptors, validation pipes, the exception filter — not just the
service method in isolation. Complements
[`./write-service-tests.md`](./write-service-tests.md), which unit-tests the
service logic alone.

## When NOT to use

Don't E2E-test what a unit test already covers (pure logic, mappers,
validators) — that's slower and less precise. Reserve E2E for the pipeline
itself: auth, ownership, status codes, response shape.

## Read first

- [`../testing/backend-e2e-standard.md`](../testing/backend-e2e-standard.md)
- The service's `*.module.ts` and `main.ts` bootstrap
- [`../rules/16-authentication-and-authorization.md`](../rules/16-authentication-and-authorization.md)

## Tests-first plan

Write the E2E spec against the endpoint contract BEFORE or alongside the
controller change: happy path (200/201), missing auth (401), wrong-owner
(403/404), invalid body (400), not-found (404), conflict where relevant (409).

## Implementation steps

1. Boot the app in the test with `Test.createTestingModule(...).compile()` then
   `app.init()` — use the real module, not a hand-assembled subset.
2. Use Supertest against the in-memory app instance.
3. Seed a test user/token via the auth test harness; never hardcode a
   production-shaped JWT secret.
4. Assert status code, response shape (required fields present, forbidden
   fields — e.g. `passwordHash`, `encryptedConfig` — absent).
5. Assert DB side effects only when this test is uniquely positioned to catch
   them (e.g. a state transition after the full pipeline); otherwise defer to
   `write-service-tests.md` for that level.
6. Close the app / DB connections in `afterAll` to avoid open-handle leaks.

## Security considerations

Always include an unauthenticated and a wrong-owner case per protected
endpoint — this is where IDOR bugs hide. Assert sensitive fields never appear
in the response body.

## Failure modes

- Testing only the happy path — negative paths (401/403/400/404/409) are
  required, not optional, per
  [`../testing/backend-e2e-standard.md`](../testing/backend-e2e-standard.md).
- Sharing mutable DB state across tests without reset/isolation, causing order
  dependence and flakiness (see
  [`../testing/flaky-test-policy.md`](../testing/flaky-test-policy.md)).

## Validation commands

```
cd apps/<service> && npm run typecheck && npm run lint && npm test
```

## Documentation updates

None beyond the test file itself, unless the endpoint contract changed — then
update `docs/12-reference/api-reference.md`.

## Definition of done

Every protected endpoint touched has a passing E2E test for its happy path AND
its 401/403/400/404 (as applicable) negative paths.
