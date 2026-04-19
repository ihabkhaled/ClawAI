---
id: page-planning
title: Page planning
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

# Page planning

## Purpose

A Next.js page in ClawAI has strict structure: one controller hook, pure render composition, all four states. Plan it before typing JSX.

## Workflow

1. Design the page's four states: loading, empty, error, success.
2. Identify the ONE controller hook (`useXPage`) that orchestrates everything.
3. List sub-hooks the controller composes (queries, mutations).
4. List components the page renders — extract new ones if needed.
5. Enumerate routes, query params, URL state.
6. List i18n keys required — add to all 8 locales.
7. Add to sidebar nav if user-facing.

## Strict rules

- **MUST** have exactly ONE controller hook per page.
- **MUST** have loading, empty, error, success states.
- **MUST NOT** call React hooks directly in `.tsx` pages — only the controller hook.
- **MUST NOT** define inline components or types in `.tsx`.
- **MUST** be added to `SIDEBAR_NAV_ITEMS` if user-visible.

## Anti-patterns

- Page with 12 `useQuery` calls inline.
- Page that only handles the happy path.
- Inline `type X = { … }` in the page file.

## Validation checklist

- [ ] One controller hook
- [ ] Four states covered
- [ ] No inline types/hooks
- [ ] Sidebar entry added
- [ ] i18n keys in 8 locales
- [ ] Routes constant updated

## Quality gate

| Check                              | Blocker? | Evidence       |
| ---------------------------------- | -------- | -------------- |
| Lint passes `no-restricted-syntax` | yes      | CI             |
| Manual UI shows all 4 states       | yes      | UI screenshots |

## Definition of done

1. Page renders.
2. All 4 states verified manually.
3. i18n works in Arabic RTL.

## Examples

- `apps/claw-frontend/src/app/(portal)/models/discovery/page.tsx`
- `apps/claw-frontend/src/hooks/discovery/use-discovery-page.ts`
