---
id: testing-baseline
title: Testing baseline
category: foundations
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
  - qa-lead
---

# Testing baseline

## Purpose

Every behavior change must ship with tests. TDD-first for utilities. High coverage on critical paths. Testing isn't a bolt-on — it's how we prove the feature works.

## When to use

- Every code change that introduces, modifies, or removes behavior.

## Inputs required

- `CLAUDE.md` — Testing, Quality Engineering Document Index
- `docs/16-quality-engineering/TDD_AND_UNIT_TESTING_STANDARD.md`

## Workflow

1. For utilities, classifiers, pure functions: write the failing tests first.
2. For services/managers/repositories: decide the test doubles (mock Prisma, mock HTTP).
3. Write tests that cover: happy path, null input, empty input, boundary input, error input, concurrent input, malformed input.
4. Run `npm run test` locally before every commit.
5. Target ≥98% coverage on critical paths (see `testing/critical-path-98-coverage.md` via `testing/coverage-strategy.md`).

## Strict rules

- **MUST** write tests for every new function that encapsulates logic.
- **MUST** ensure `npm run test` passes before committing. **BLOCKER** if tests fail.
- **MUST** include negative and boundary cases, not just happy paths.
- **MUST NOT** suppress tests to land a PR.
- **MUST NOT** skip tests for "time" — that's debt plus risk.
- **MUST** use the framework appropriate to the workspace — Jest for backend, Vitest for frontend.

## Anti-patterns

- Single happy-path test that hits 98% line coverage but asserts nothing meaningful.
- Commenting out a test instead of fixing it.
- Mocking the thing under test.

## Validation checklist

- [ ] New behavior has at least one test
- [ ] Negative/boundary cases tested
- [ ] `npm run test` passes 0 failures
- [ ] Coverage report reviewed (for critical paths, ≥98%)

## Quality gate

| Check                           | Blocker?                            | Evidence           |
| ------------------------------- | ----------------------------------- | ------------------ |
| Tests pass                      | yes                                 | `npm run test`     |
| Critical-path coverage ≥98%     | yes (for designated critical paths) | `npm run test:cov` |
| Tests cover negative + boundary | yes                                 | Code review        |

## Test requirements

| Type        | Scope                 | Bar                           |
| ----------- | --------------------- | ----------------------------- |
| Unit        | new functions/classes | every branch                  |
| Integration | every new endpoint    | happy + 400 + 401 + 404 + 409 |
| QA script   | every new feature     | see `qa-expectations.md`      |

## Definition of done

1. Tests exist for every new behavior.
2. All tests pass.
3. Critical paths hit ≥98%.
4. Evidence captured (CI log or local output).

## Examples

- `apps/claw-ollama-service/src/modules/ollama/utilities/__tests__/model-classifier.utility.spec.ts` — TDD-first, 11 test cases covering families, keywords, fallback, confidence scoring.

## References

- `CLAUDE.md` — Quality Gates (Pre-Commit Hook), Quality Engineering
- `docs/16-quality-engineering/TDD_AND_UNIT_TESTING_STANDARD.md`
- `testing/tdd-workflow.md`
- `testing/coverage-strategy.md`
