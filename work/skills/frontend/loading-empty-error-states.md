---
id: loading-empty-error-states
title: Loading / empty / error / success states
category: frontend
level: mandatory
applies_to:
  - frontend-page
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - frontend-team
---

# Loading / empty / error / success states

## Purpose

Every page has 4 states. Missing any one = bug in production. "It works in dev" is not a state design.

## Workflow

1. For the happy path, design the success state.
2. For the loading moment, use `<LoadingSpinner />` or skeleton — never a blank page.
3. For zero results, use `<EmptyState />` with icon + title + description + call-to-action.
4. For failure, show an error message with retry or guidance.
5. For partial-failure (some items failed), show the partial success AND the failure count.
6. Manually test each state by:
   - Disabling network (loading → error)
   - Using a new user with 0 data (empty)
   - Returning 500 from backend (error)

## Strict rules

- **MUST** implement all 4 states before claiming done. **BLOCKER**.
- **MUST NOT** render a blank container during loading.
- **MUST NOT** crash on missing data — render empty state.

## Anti-patterns

- Page that renders `null` during loading.
- Empty state that says "Error" because the query returned `[]`.
- Error state with no retry button.

## Validation checklist

- [ ] Loading state visible
- [ ] Empty state visible (tested with zero data)
- [ ] Error state visible (tested with failing API)
- [ ] Success state correct
- [ ] Partial-failure handled (if applicable)

## Quality gate

| Check                        | Blocker? | Evidence    |
| ---------------------------- | -------- | ----------- |
| Manual UI shows all 4 states | yes      | Screenshots |

## Definition of done

1. All 4 states implemented.
2. All 4 states manually tested.
3. Screenshots attached to PR.

## References

- `apps/claw-frontend/src/components/common/` for `LoadingSpinner`, `EmptyState`
