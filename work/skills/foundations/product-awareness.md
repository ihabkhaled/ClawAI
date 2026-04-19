---
id: product-awareness
title: Product awareness
category: foundations
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - product-lead
  - platform-team
---

# Product awareness

## Purpose

Code that's technically correct but misses the user's actual need is wasted code. Before writing anything, every agent must understand the user, the business driver, and how success will be measured.

## When to use

- Every feature or enhancement.
- Every bug fix with user-visible impact.

## Inputs required

- `docs/01-executive-context/product-vision.md`
- `docs/02-business-product/feature-inventory.md`
- `docs/02-business-product/user-personas.md`
- The user's original request (verbatim)

## Workflow

1. Restate the user's request in your own words. If you can't, re-read it.
2. Identify the user persona affected (admin, operator, viewer, end-user).
3. Identify the business driver — compliance? cost? adoption? retention?
4. Identify the success metric — quantifiable and observable.
5. List user-visible states: loading, empty, error, success, partial-failure.
6. Write 3 UAT scenarios a non-technical user can run.
7. Only then, start planning the technical implementation.

## Strict rules

- **MUST** state the business driver in the plan document.
- **MUST** state the success metric.
- **MUST** enumerate every user-visible state before coding the UI.
- **MUST NOT** start implementing until the plan references a user persona and a business driver.

## Anti-patterns

- "The ticket says X, so I implement X literally." No user context, no success metric.
- Building a 5-filter admin screen when the business driver was "show recent failures at a glance".
- Skipping the empty state because "there's always data in dev".

## Validation checklist

- [ ] Business driver stated in plan
- [ ] Success metric stated
- [ ] User persona identified
- [ ] All user-visible states enumerated
- [ ] 3 UAT scenarios drafted

## Quality gate

| Check                                                        | Blocker? | Evidence  |
| ------------------------------------------------------------ | -------- | --------- |
| Plan doc in `.claude/Integrations/` contains product framing | yes      | Plan file |

## Test requirements

N/A — feeds into `business-product/` skills for UAT test design.

## Definition of done

1. Plan contains business driver.
2. Plan contains success metric.
3. Plan lists user-visible states.
4. Plan lists 3 UAT scenarios.

## Examples

- `.claude/Integrations/ollama-dynamic-discovery__PLAN.md` — section 0g "Business and Product Framing".

## References

- `CLAUDE.md` — Phase 0g: Business and Product Framing
- `docs/01-executive-context/product-vision.md`
- `business-product/business-problem-framing.md`
