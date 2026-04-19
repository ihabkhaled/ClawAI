---
id: tdd-workflow
title: TDD workflow
category: testing
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - qa-lead
---

# TDD workflow

## Purpose

Red → green → refactor. Writing tests after the fact produces tests that match the bugs in the code. TDD catches design smells early.

## Workflow

1. Write a failing test that describes the next behavior.
2. Run: `npm run test` — verify it fails for the right reason.
3. Write the minimum code to pass. Nothing more.
4. Run: `npm run test` — verify it passes.
5. Refactor: rename, extract, simplify. Tests stay green.
6. Repeat for the next case.

## Strict rules

- **MUST** write the test first for pure utilities, classifiers, normalizers, rankers.
- **MUST** see the test fail before the implementation exists.
- **MUST NOT** commit a skipped or `.only` test.
- **MUST NOT** disable a test to land a PR.

## Anti-patterns

- Writing a test AFTER the implementation, then tweaking to pass.
- Skipping "red" because "I know it'll fail".
- Massive test at the end that asserts 8 things — split it.

## Validation checklist

- [ ] Test written first
- [ ] Test fails before code
- [ ] Minimal impl to pass
- [ ] Refactor with green tests
- [ ] No `.only` / `skip`

## Quality gate

| Check                             | Blocker? | Evidence |
| --------------------------------- | -------- | -------- |
| `npm run test` green              | yes      | CI       |
| No `.only` / `.skip` in new tests | yes      | grep     |

## Definition of done

1. TDD loop completed for every new utility.
2. Tests green.

## Examples

- `apps/claw-ollama-service/src/modules/ollama/utilities/__tests__/*.spec.ts` — written before implementation.
