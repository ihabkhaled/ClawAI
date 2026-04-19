---
id: uat-preparation
title: UAT preparation
category: business-product
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - product-lead
  - qa-lead
---

# UAT preparation

## Purpose

Pass/fail by a non-technical user. UAT scenarios prove the feature works for its intended audience, not just the people who built it.

## When to use

- Every user-facing feature.

## Workflow

1. Identify the primary persona.
2. Write at least 3 scenarios the persona can execute end-to-end without docs.
3. Each scenario: starting state → steps → expected outcome.
4. Include at least one failure scenario (wrong input, mid-flow refresh, permission error).
5. Keep scenarios to <10 steps each.
6. Save to `.claude/Integrations/<feature>__UAT.md`.

## Strict rules

- **MUST** write 3+ scenarios.
- **MUST** include at least one failure scenario.
- **MUST NOT** assume the user has developer tools open.

## Anti-patterns

- "Log in, do the thing, done" — not a scenario.
- Scenarios that only pass on a perfectly configured dev environment.

## Validation checklist

- [ ] 3+ scenarios written
- [ ] Failure scenario included
- [ ] Each scenario ≤10 steps
- [ ] Non-technical language

## Quality gate

| Check            | Blocker? | Evidence                                 |
| ---------------- | -------- | ---------------------------------------- |
| UAT file present | yes      | `.claude/Integrations/<feature>__UAT.md` |

## Definition of done

1. UAT file exists.
2. Product owner (or proxy) has run through scenarios.
3. Any failed scenario is fixed or explicitly marked a known limitation.

## References

- `e2e-manual-testing/uat-scenario-generation.md`
- `docs/16-quality-engineering/UAT_STANDARD.md`
