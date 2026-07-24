---
name: write-service-tests
summary: Test service-layer methods — ownership checks, event publishing, mocked repositories, and every error branch — with boundaries mocked.
task_keywords:
  [
    service test,
    service layer,
    ownership check,
    event publishing,
    mock RabbitMQService,
    mock repository,
    error path,
    catch branch,
    jest,
    spec.ts,
    business logic test,
  ]
applies_to: [backend, apps/claw-<service>-service/src/modules/<domain>]
required_rules: [04-testing-rules, 02-backend-rules, 08-security-rules]
required_context: [TDD_AND_UNIT_TESTING_STANDARD, ai-context-pack]
affected_workspaces: [apps/claw-<service>-service]
required_tests: [service spec (happy + ownership + error branches), manager error-path spec]
required_docs: [docs/04-backend/service-guide-<service>.md]
validation_lane: cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test -- --coverage && npm run build
---

# Skill: Write Service-Layer Tests

Service methods hold the business logic: ownership/permission validation, orchestration, and event publishing. They call repositories (data access, no throw) and managers (≤80-line orchestration). Service methods are ≤30 lines. Tests mock every boundary — repository, RabbitMQ, HTTP, Ollama — and exercise the REAL service method.

## When to use

- New/changed `*.service.ts` or `*.manager.ts` method.
- A method that validates ownership, publishes a `claw.events` event, or has multiple error branches.

## When NOT to use

- Pure function with no I/O → [`./write-unit-tests.md`](./write-unit-tests.md).
- Cross-service producer→consumer contract → [`./write-integration-tests.md`](./write-integration-tests.md).
- HTTP status/shape assertions → [`./write-api-contract-tests.md`](./write-api-contract-tests.md).

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md).
- [`../rules/04-testing-rules.md`](../rules/04-testing-rules.md) — T1 error branches, Coverage Rules (service 95%, manager 90%).
- [`../rules/02-backend-rules.md`](../rules/02-backend-rules.md) — layering, ownership belongs in service.
- [`./04-debug-toolkit.md`](./04-debug-toolkit.md) for reproducing a failing path.

## Repository discovery steps

1. Read the service method under test — list its repository calls, event publishes, and every `throw`/error branch.
2. Read a sibling `__tests__/*.service.spec.ts` for the NestJS `Test.createTestingModule` + provider-mock convention.
3. Identify the injected boundaries to mock: the repository, `RabbitMQService`, any HTTP client, any Ollama/adapter dependency.

## Tests-first plan

- Happy path returns the expected shape and calls the repository/publish exactly once.
- Ownership: a resource owned by a different user → `BusinessException` FORBIDDEN or `EntityNotFoundException`.
- Event publishing: assert `RabbitMQService.publish` called with the correct pattern (from shared-types) and payload.
- Every catch branch: force the mocked boundary to reject and assert the error `code` and that the error is logged/rethrown, not swallowed.
- Boundary inputs (empty, max-length) at the service entry.

## Implementation steps

1. Build a testing module (`Test.createTestingModule`) providing the real service plus jest-mocked repository, `RabbitMQService`, and adapters.
2. Never mock the service under test; mock only its collaborators.
3. Assert behaviour: returned value, thrown exception `code`, and mock call args (`expect(repo.create).toHaveBeenCalledWith(...)`).
4. Cover ownership: seed a fixture with a mismatched `userId`, expect the forbidden/not-found path.
5. Cover event publishing: verify pattern + payload against the shared-types constant, not a string literal.
6. Cover EVERY catch: make each boundary reject once; assert error handling and that `logger.error` fired (spy) before rethrow.
7. Run `--coverage`; every branch of a ≤30-line method must be hit.

## Security considerations

- Ownership tests are security tests — a missing one is a horizontal-privilege bug.
- Assert responses/returns never carry sensitive columns (encrypted config, password hash, refresh token).
- Never log secrets in test spies; assert redaction where relevant.

## Failure modes

- Testing only the happy path — every error branch must be covered or coverage drops below 92%.
- Mocking the repository to return whatever the assertion wants without asserting call args → a mock that lies.
- Forgetting to assert the event pattern → producer→consumer contract drifts silently.
- Swallowed errors passing because the test never forces a rejection.

## Validation commands

```bash
cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test -- --coverage && npm run build
```

## Documentation updates

- Update `docs/04-backend/service-guide-<service>.md` if the method changes behaviour or events.
- Record coverage + error-path evidence in `.claude/Integrations/<feature>__QA_output.md`.

## Definition of done

- Happy + ownership + every error branch + event-publish assertions green; boundaries mocked, unit not mocked; ≥92% coverage held; error paths assert logging and `code`.
