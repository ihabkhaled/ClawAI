---
name: write-unit-tests
summary: Write pure unit tests for utilities, DTOs, and pure functions with DTO fuzzing and boundary/null/empty/overflow coverage.
task_keywords:
  [
    unit test,
    jest,
    vitest,
    dto fuzz,
    zod schema test,
    utility test,
    pure function,
    boundary,
    null,
    empty,
    overflow,
    coverage,
    ts-jest,
    spec.ts,
  ]
applies_to:
  [backend, frontend, apps/claw-<service>-service, apps/claw-frontend, packages/shared-utilities]
required_rules: [04-testing-rules, 02-backend-rules, 09-refactor-rules]
required_context: [TDD_AND_UNIT_TESTING_STANDARD, ai-context-pack]
affected_workspaces: [apps/claw-<service>-service, apps/claw-frontend, packages/shared-utilities]
required_tests: [unit spec, dto fuzz spec]
required_docs: [docs/09-testing/README, docs/04-backend/service-guide-<service>.md]
validation_lane: cd <workspace> && npm run typecheck && npm run lint && npm test -- --coverage && npm run build
---

# Skill: Write Unit Tests

Unit tests exercise a single unit — a utility, a Zod DTO, a pure function — in isolation with zero I/O. They are the TDD floor: write the failing test BEFORE the implementation. Backend uses Jest (ts-jest, `*.spec.ts` in `__tests__/`); frontend uses Vitest (`*.test.ts`/`*.spec.ts`). Test files have all ESLint restrictions OFF and `any` is allowed.

## When to use

- New/changed utility in `src/common/utilities/` or `packages/shared-utilities/`.
- New/changed Zod DTO schema (`*.dto.ts`) — always paired with a fuzz spec.
- Any pure function: classifiers, normalizers, parsers, token estimators, expression evaluators.

## When NOT to use

- The unit does DB/HTTP/RabbitMQ/Ollama/ClamAV I/O → use [`./write-service-tests.md`](./write-service-tests.md) or [`./write-integration-tests.md`](./write-integration-tests.md).
- HTTP status/response-shape contract → [`./write-api-contract-tests.md`](./write-api-contract-tests.md).

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md) — run `npm run knowledge:context -- --task="unit test <thing>"` first.
- [`../rules/04-testing-rules.md`](../rules/04-testing-rules.md) — T1 (unit), T3 (DTO fuzz), Coverage Rules.
- [`./05-qa-toolkit.md`](./05-qa-toolkit.md) — DTO fuzz template.

## Repository discovery steps

1. Find a sibling `__tests__/*.spec.ts` for the unit under test to mirror import + describe conventions.
2. Read the unit's real signature — never guess return types; import the real symbol, not a copy.
3. For a DTO, read the Zod schema to list every `.max()`, every enum-backed field, and every required field.

## Tests-first plan

Per the T1 case matrix, cover ALL six for every unit:

1. Happy path (expected in → expected out).
2. Empty input (`''`, `[]`, `0`, `null`, `undefined`).
3. Boundary (exactly at `.max()`, min value, max value).
4. Invalid input (wrong type, wrong format, wrong enum).
5. Error path (throws / returns error result).
6. Idempotent/concurrent (same call twice is safe).

For a DTO fuzz spec: valid object; boundary object at each `.max()`; over-length string and over-size array (must reject); missing each required field individually; null vs undefined; string `"123"` rejected for number fields; invalid enum rejected.

## Implementation steps

1. Create the spec next to the unit: backend `apps/<service>/__tests__/dto/<name>.dto.spec.ts` or `.../__tests__/<name>.utility.spec.ts`; frontend `apps/claw-frontend/src/__tests__/...`.
2. Import the REAL unit under test — never mock or re-implement it.
3. Write behaviour assertions: assert the returned value, thrown code, or rejected schema — NOT `.toBeDefined()` alone.
4. Use `expect(() => Schema.parse(x)).toThrow()` for reject cases; assert parsed output for accept cases.
5. Add each of the six case types; for DTOs add the seven fuzz cases.
6. Run coverage; fill uncovered branches (see [`./increase-coverage-correctly.md`](./increase-coverage-correctly.md)).

## Security considerations

- Fuzz `.max()` bounds — unbounded strings/arrays are a payload-DoS vector (security-rules).
- Never put real secrets/tokens/keys in fixtures; use obvious dummies.
- Assert DTOs reject SQL-injection-shaped and oversized inputs.

## Failure modes

- `.toBeDefined()`-only assertions — banned; assert behaviour.
- Mocking the unit under test — forbidden; mocks belong at boundaries only.
- `xit`/`xdescribe`/`.skip()` — CI rejects.
- Real clock/random inside a pure unit test → flaky; inject or freeze (see [`./debug-flaky-test.md`](./debug-flaky-test.md)).

## Validation commands

```bash
cd <workspace>   # apps/claw-<service>-service | apps/claw-frontend | packages/<pkg>
npm run typecheck && npm run lint && npm test -- --coverage && npm run build
```

## Documentation updates

- If the unit is a new shared utility, note it in `docs/04-backend/shared-packages.md`.
- Record coverage delta in `.claude/Integrations/<feature>__QA_output.md`.

## Definition of done

- All six case types (plus seven DTO fuzz cases) present and green; ≥92% coverage held on all four metrics; no `.skip`/`.toBeDefined()`-only; no boundary mock of the unit.
