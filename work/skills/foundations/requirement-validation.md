---
id: requirement-validation
title: Requirement validation
category: foundations
level: mandatory
depends_on:
  - foundations/product-awareness
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - product-lead
  - platform-team
---

# Requirement validation

## Purpose

A user request is a hypothesis about what they need. Requirement validation turns that hypothesis into a testable contract before any code is written. Missing requirements are the #1 source of rework.

## When to use

- Every new feature or substantial change.
- Whenever a request feels ambiguous — treat that feeling as a signal.

## Inputs required

- User's original request
- `product-awareness.md` output (persona, driver, metric)

## Workflow

1. List every **verb** and **noun** in the user's request. Each becomes a candidate acceptance criterion.
2. Write explicit acceptance criteria (numbered, testable). Each starts with a concrete input and ends with a concrete output.
3. Write explicit **failure criteria** — what MUST NOT happen.
4. Identify hidden requirements — what's implicit? (auth? i18n? error handling? idempotency? rate limit?)
5. Surface ambiguities — either ask, or resolve with a clearly-stated assumption in the plan.
6. Map every criterion to a test or QA check.

## Strict rules

- **MUST** write numbered, testable acceptance criteria.
- **MUST** write explicit failure criteria.
- **MUST NOT** start coding until every verb in the user's request maps to an acceptance criterion.
- **MUST NOT** assume silently — state assumptions in the plan.

## Anti-patterns

- Vague criteria: "works well" — not testable.
- Copying the request verbatim as the "criteria".
- Missing the empty state, the permissions check, or the i18n.
- Coding first, criteria after.

## Validation checklist

- [ ] Every verb/noun in the user's request has a criterion
- [ ] Every criterion is testable (input → output)
- [ ] Failure criteria enumerated
- [ ] Hidden requirements surfaced (auth, i18n, errors, idempotency, rate limit)
- [ ] Ambiguities resolved or stated as assumptions

## Quality gate

| Check                             | Blocker?                    | Evidence  |
| --------------------------------- | --------------------------- | --------- |
| Plan contains acceptance criteria | yes                         | Plan file |
| Plan contains failure criteria    | yes                         | Plan file |
| Assumptions documented            | yes (when ambiguity exists) | Plan file |

## Test requirements

Each acceptance criterion MUST have at least one test or QA assertion pointing to it.

## Definition of done

1. Numbered acceptance criteria in plan.
2. Failure criteria in plan.
3. All ambiguities either resolved or explicitly flagged as assumptions.
4. Every criterion mapped to a test plan.

## Examples

- `.claude/Integrations/ollama-dynamic-discovery__PLAN.md` — sections 0d and 0e list 20 acceptance criteria + 7 failure criteria.

## References

- `CLAUDE.md` — Phase 0: Pre-Coding Planning Gate
- `docs/16-quality-engineering/PLANNING_STANDARD.md`
- `business-product/acceptance-criteria.md`
