---
id: data-fetching
title: Data fetching
category: frontend
level: mandatory
applies_to:
  - frontend-page
  - frontend-hook
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - frontend-team
---

# Data fetching

## Purpose

All server state lives in TanStack Query. Fetches go through repositories, keyed by the `queryKeys` factory. Never directly in components.

## Workflow

1. Add API method to `src/repositories/<domain>/<domain>.repository.ts`.
2. Add a query key in `src/repositories/shared/query-keys.ts`.
3. Wrap the fetch in a hook under `src/hooks/<domain>/use-<name>.ts`.
4. For lists with filters, pass the filters object as the query key suffix.
5. For polling/live data, use `refetchInterval` — but make it conditional on state.
6. For mutations, invalidate the relevant query keys in `onSuccess`.

## Strict rules

- **MUST** call fetches through repositories. **BLOCKER** on direct `fetch` in components.
- **MUST** use keys from `queryKeys` — never inline arrays.
- **MUST** invalidate on mutation.
- **MUST NOT** put `useQuery`/`useMutation` directly in `.tsx` files — wrap in a hook.

## Anti-patterns

- `useQuery(['threads'], () => fetch(...))` in a component.
- Missing invalidation → stale UI after mutation.
- Infinite polling that never stops.

## Validation checklist

- [ ] Fetches go through repository
- [ ] Query keys in `queryKeys`
- [ ] Mutations invalidate
- [ ] Polling has a stop condition

## Quality gate

| Check                           | Blocker? | Evidence  |
| ------------------------------- | -------- | --------- |
| No direct `fetch` in components | yes      | grep      |
| Invalidation works              | yes      | Manual UI |

## Definition of done

1. Repository method exists.
2. Hook wraps query/mutation.
3. Keys invalidate correctly.

## References

- `apps/claw-frontend/src/hooks/discovery/*` for examples
