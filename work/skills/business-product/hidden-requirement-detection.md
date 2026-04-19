---
id: hidden-requirement-detection
title: Hidden requirement detection
category: business-product
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - product-lead
---

# Hidden requirement detection

## Purpose

Users only say what they think you need to know. The rest is implicit. Hidden requirements are the biggest source of post-merge rework.

## When to use

- Every feature, after `acceptance-criteria.md` and before architecture planning.

## Inputs required

- Acceptance criteria list
- Persona context

## Workflow

Walk this checklist for every feature:

1. **Auth** — who can access this? Which roles?
2. **i18n** — is user-facing text present? If yes, 8 locales.
3. **Empty state** — what does "no data yet" look like?
4. **Loading state** — what shows while fetching?
5. **Error state** — what shows on failure?
6. **Partial failure** — what if 2 of 10 items fail?
7. **Concurrency** — what if two users do this simultaneously?
8. **Idempotency** — what if the request retries?
9. **Rate limiting** — what if a user hammers it?
10. **Pagination** — is the list bounded? What's the page size?
11. **Sorting / filtering** — what's the default? Is it persistent?
12. **Audit** — does this action need an audit log event?
13. **Observability** — what metrics/logs are useful for on-call?
14. **Rollback** — if this goes wrong in prod, how do we undo?
15. **Mobile** — does this need to work at small viewport?
16. **Accessibility** — keyboard, screen reader, contrast?
17. **RTL** — does Arabic render correctly?
18. **Timezones** — how are dates shown?
19. **Permissions** — can one user see another user's data?
20. **Secret handling** — any new secrets involved?

## Strict rules

- **MUST** walk this entire checklist for every feature.
- **MUST** add any gap as a new acceptance criterion.

## Anti-patterns

- Skipping items because "the request didn't ask for that".
- Treating the checklist as advisory.

## Validation checklist

- [ ] Every one of the 20 items walked
- [ ] Gaps converted to criteria

## Quality gate

| Check                               | Blocker? | Evidence |
| ----------------------------------- | -------- | -------- |
| Checklist in plan or PR description | yes      | Document |

## Definition of done

1. All 20 items walked.
2. New criteria added or explicitly marked N/A with one-line reason.

## Examples

- `.claude/Integrations/ollama-dynamic-discovery__PLAN.md` — sections 0b (impacted-area map) and 0f (test strategy) cover 12 of these via the impacted-area mapping.

## References

- `foundations/requirement-validation.md`
