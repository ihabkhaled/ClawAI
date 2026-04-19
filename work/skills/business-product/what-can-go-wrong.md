---
id: what-can-go-wrong
title: What can go wrong (pre-mortem)
category: business-product
level: recommended
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - product-lead
---

# What can go wrong (pre-mortem)

## Purpose

Imagine it's 6 months after shipping and the feature is a disaster. What went wrong? Listing failure modes before coding prevents 80% of production incidents.

## When to use

- Every non-trivial feature.

## Workflow

1. For 10 minutes, imagine the feature in production, failing. Write every scenario.
2. For each scenario, note: likelihood (LOW/MED/HIGH), impact (LOW/MED/HIGH), mitigation.
3. Prioritize mitigating HIGH-impact scenarios before coding the happy path.
4. Capture as a table in the plan.

## Strict rules

- **MUST** capture HIGH-impact scenarios with named mitigation.
- **MUST NOT** treat this as an afterthought.

## Anti-patterns

- "It could fail" — be specific.
- Listing only technical failures — include product/user failures too.

## Validation checklist

- [ ] At least 5 scenarios listed
- [ ] Likelihood + impact + mitigation for each
- [ ] HIGH-impact scenarios have specific mitigation

## Quality gate

| Check              | Blocker?                        | Evidence  |
| ------------------ | ------------------------------- | --------- |
| Risk table in plan | yes (for medium/large features) | Plan file |

## Definition of done

1. Risk table in plan.
2. HIGH-impact scenarios mitigated before coding.

## Examples

- `.claude/Integrations/ollama-dynamic-discovery__PLAN.md` section 0c — 9-row risk table.

## References

- `architecture-planning/failure-mode-planning.md`
