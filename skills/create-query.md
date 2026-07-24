---
name: create-query
summary: Wrap a TanStack useQuery in a single-responsibility hook backed by a repository call and a query-key factory, exposing loading/error/data to the controller hook.
task_keywords:
  [
    useQuery,
    tanstack query,
    data fetching hook,
    query key factory,
    get request,
    server state,
    read hook,
  ]
applies_to: [claw-frontend]
required_rules: [03-frontend-rules, 04-testing-rules]
required_context: [ai-context-pack, codebase-navigation]
affected_workspaces: [claw-frontend]
required_tests: [vitest]
required_docs: [docs/05-frontend]
validation_lane: cd apps/claw-frontend && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Create a Query Hook (useQuery)

All GET/server-read state goes through a TanStack `useQuery` wrapped in a custom hook — never
called directly in a `.tsx`. The hook pairs a repository function with a query-key factory.

## When to use

- Reading a list or a single entity from the backend (`/api/v1/...` via nginx).

## When NOT to use

- Writes → `./create-mutation.md`. Client-only UI state → Zustand/`useState` in a hook.

## Read first

- `./resolve-task-context.md` — resolve the task pack.
- `../rules/03-frontend-rules.md` — Hook Rules + API Communication Pattern.

## Repository discovery steps

1. `Grep` `src/repositories/<domain>/` — reuse the existing repository function or add one (`./03-feature-scaffold.md` FE step 4 shape).
2. Read `src/repositories/shared/query-keys.ts` — extend the domain's factory; do not hardcode array keys inline.
3. Confirm FE return type mirrors the BE DTO field names verbatim.

## Tests-first plan

- Vitest with `QueryClientProvider`: mock the repository, assert `isLoading` → `data` transition and `isError` on rejection.
- Assert the hook calls the repository with the right params and query key.

## Implementation steps

1. Add/confirm the repository function in `src/repositories/<domain>/<domain>.repository.ts` (one function per endpoint via `apiClient`).
2. Add/extend the query-key factory in `src/repositories/shared/query-keys.ts` (`all`, `lists()`, `detail(id)`).
3. Create `src/hooks/<domain>/use-<name>.ts`:
   - `useQuery({ queryKey: <factory>, queryFn: <repositoryFn> })`.
   - Pass params into both the key and the `queryFn`.
   - Set `enabled` when the query depends on a value that may be undefined.
4. Return `{ data, isLoading, isError }` (or a typed narrowing) — no inline `type`/`const` in the hook file.
5. Let the controller hook (`./create-view-model-hook.md`) consume it; the `.tsx` never calls `useQuery`.

## Security considerations

- Never place JWTs or secrets in the query key or URL query params; `apiClient` attaches auth headers.

## Failure modes

- `useQuery` called directly in a `.tsx` → wrap in a hook.
- Inline array query key → use the factory so invalidation from mutations matches.
- FE type field renamed vs BE → runtime undefined; mirror names.

## Validation commands

`cd apps/claw-frontend && npm run typecheck && npm run lint && npm test && npm run build`. Never `--no-verify`.

## Documentation updates

- Update the domain's `docs/05-frontend/*` doc if a new query surface is added.

## Definition of done

- Repository function + query-key factory + wrapped `useQuery` hook; typed return; consumed only via controller hook; validation lane green.
