---
id: business-problem-framing
title: Business problem framing
category: business-product
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
---

# Business problem framing

## Purpose

Turn a technical request into a business problem statement before designing the solution. This prevents "we built it right but it was the wrong thing".

## When to use

- Every feature. Every substantial change.

## Inputs required

- User's request (verbatim)
- `docs/01-executive-context/business-overview.md`
- Relevant persona from `docs/02-business-product/user-personas.md`

## Workflow

1. Write a one-sentence problem statement: "Who has what pain, and why does it matter to the business?"
2. Write the business driver: regulation, cost, adoption, retention, revenue, risk.
3. Write the success metric: quantifiable, observable, time-bound.
4. Name the primary persona and one secondary persona.
5. Write one sentence describing what "not solving this" costs the business.
6. Write one sentence describing the "done" state from the business's perspective.

## Strict rules

- **MUST** write all six items above in the plan document.
- **MUST** quantify the metric (a number, or "yes/no" with a crisp definition).
- **MUST NOT** write framing that could apply to any random feature.

## Anti-patterns

- "Users want a better experience" — not framing, that's marketing.
- Metrics like "users are happier" — unmeasurable.
- Framing the technical solution ("we'll add a new endpoint") before the business problem.

## Validation checklist

- [ ] Problem statement in one sentence
- [ ] Business driver named
- [ ] Success metric is quantifiable
- [ ] Primary + secondary persona named
- [ ] Cost of not solving stated
- [ ] Business "done" stated

## Quality gate

| Check                   | Blocker? | Evidence  |
| ----------------------- | -------- | --------- |
| Framing present in plan | yes      | Plan file |

## Definition of done

1. Plan document has a complete business framing section.
2. Metric is genuinely measurable.
3. Reviewer confirms framing is specific and non-generic.

## Examples

- `.claude/Integrations/ollama-dynamic-discovery__PLAN.md` section 0g.

## References

- `foundations/product-awareness.md`
- `docs/02-business-product/user-personas.md`
