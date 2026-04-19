---
id: acceptance-criteria
title: Acceptance criteria
category: business-product
level: mandatory
depends_on:
  - foundations/requirement-validation
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - product-lead
  - qa-lead
---

# Acceptance criteria

## Purpose

Numbered, testable, input→output sentences that turn intent into a contract. Acceptance criteria are how we know the feature works; they're also the index of the QA script.

## When to use

- Every feature or substantial change.

## Inputs required

- Business framing (`business-problem-framing.md`)
- User's original request

## Workflow

1. Read the request three times.
2. Write each criterion as: "When `<input>`, the system `<produces>` `<output>`."
3. Number them (1, 2, 3, …) so they're referenceable.
4. For each criterion, name the test that proves it (unit, integration, QA script, manual UAT).
5. Write failure criteria separately: "The system MUST NOT `<bad behavior>`."
6. Review the list against the persona: does every persona-relevant path have at least one criterion?

## Strict rules

- **MUST** make every criterion testable in one sentence.
- **MUST** start criteria with a concrete trigger and end with a concrete, observable outcome.
- **MUST** separate positive criteria from failure criteria.
- **MUST NOT** use words like "works well", "seamless", "user-friendly" — unmeasurable.

## Anti-patterns

- "The feature works end-to-end" — unmeasurable.
- Criteria that require a screenshot to understand.
- A single mega-criterion listing 10 things.

## Validation checklist

- [ ] Every criterion is numbered
- [ ] Every criterion has input and output
- [ ] Every criterion maps to a test
- [ ] Failure criteria listed separately
- [ ] Every persona path covered

## Quality gate

| Check                         | Blocker? | Evidence  |
| ----------------------------- | -------- | --------- |
| Acceptance criteria present   | yes      | Plan file |
| Each criterion maps to a test | yes      | Plan file |

## Definition of done

1. Criteria are numbered and testable.
2. Each maps to at least one test.
3. Failure criteria present.

## Examples

- `.claude/Integrations/ollama-dynamic-discovery__PLAN.md` sections 0d (20 criteria) and 0e (7 failure criteria).

## References

- `foundations/requirement-validation.md`
- `docs/16-quality-engineering/TEST_CASE_DESIGN_STANDARD.md`
