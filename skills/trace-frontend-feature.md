---
name: trace-frontend-feature
summary: Trace a frontend feature — page.tsx (render-only, one controller hook) → controller hook → smaller hooks/queries → repository → API, plus query-keys.
task_keywords:
  [
    trace frontend,
    page,
    controller hook,
    hook,
    tanstack query,
    useQuery,
    useMutation,
    repository,
    query keys,
    zustand,
    component,
    render,
    next.js,
    feature flow,
  ]
applies_to: [claw-frontend]
required_rules: [00-master-rules, 03-frontend-rules]
required_context: [codebase-navigation, ai-context-pack]
affected_workspaces: [claw-frontend]
required_tests: [none-read-only]
required_docs: [none]
validation_lane: cd apps/claw-frontend && npm run typecheck (read-only trace)
---

## When to use

You need to understand or debug a frontend feature: which page renders it, which
single controller hook it uses, the smaller query/mutation hooks underneath, the
repository that calls the API, and the TanStack Query keys that drive
caching/invalidation. Use before changing UI behavior, data fetching, or state.

## When NOT to use

For the backend half of the same feature use
[`./trace-request-end-to-end.md`](./trace-request-end-to-end.md). To just find a
file use [`./navigate-codebase.md`](./navigate-codebase.md).

## Read first

- [`../rules/03-frontend-rules.md`](../rules/03-frontend-rules.md) — page/hook/component architecture
- [`./01-codebase-navigation.md`](./01-codebase-navigation.md) — frontend structure map

## Repository discovery steps

The canonical chain: `apps/claw-frontend/src/app/(portal)/<route>/page.tsx`
(pure render, exactly ONE controller hook, must handle loading/empty/error) →
`src/hooks/<domain>/use-<name>.ts` (controller hook orchestrates smaller
single-responsibility hooks) → `useQuery`/`useMutation` hooks → repository in
`src/repositories/<domain>/<domain>.repository.ts` → API via nginx. Query keys
live in `src/repositories/shared/query-keys.ts`. Server state = TanStack Query;
minimal client state = Zustand stores in `src/stores/`. UI = shadcn/ui; text via
i18n (9 locales).

## Tests-first plan

Before concluding the trace is correct, confirm it in the running app
(`https://claw.local`) or via `cd apps/claw-frontend && npm run typecheck`:
verify the page imports exactly the controller hook you identified, and that the
mutation's `onSuccess` invalidates the query key you traced. If data is stale
after an action, the missing/incorrect invalidation is the finding.

## Implementation steps

1. **Find the page:**
   ```bash
   find apps/claw-frontend/src/app -path "*<route>*page.tsx"
   ```
2. **Identify the one controller hook** the page calls (top of the component).
3. **Open the controller hook** in `src/hooks/<domain>/` — list the smaller
   hooks/queries it composes.
4. **Find the query/mutation hooks and their keys:**
   ```bash
   grep -rn "useQuery\|useMutation" apps/claw-frontend/src/hooks/<domain> --include="*.ts"
   grep -rn "<domain>" apps/claw-frontend/src/repositories/shared/query-keys.ts
   ```
5. **Follow to the repository** method that issues the HTTP call.
6. **Trace invalidation:** find each `onSuccess` → `invalidateQueries` to see
   what refetches after a mutation.

## Security considerations

No secrets in the frontend. Confirm no token is placed in a URL query param
(SSE uses `fetch` with an `Authorization` header, never `EventSource`). All
user-facing strings must be i18n keys, never hardcoded.

## Failure modes

- **Logic in page.tsx** — violates render-only rule; the real logic is in the
  hook, keep tracing there.
- **Multiple hooks called directly in the page** — violates the one-controller-
  hook rule; flag per frontend rules.
- **Stale UI after mutation** — query key mismatch between the query and the
  `invalidateQueries` call.
- **Inline types/consts in .tsx** — extraction violation; note it.

## Validation commands

```bash
grep -rn "use[A-Z]" apps/claw-frontend/src/app/(portal)/<route>/page.tsx
grep -rn "invalidateQueries" apps/claw-frontend/src/hooks/<domain> --include="*.ts"
cd apps/claw-frontend && npm run typecheck
```

## Documentation updates

None for tracing. A behavior change means updating the relevant frontend doc and
i18n locale files if text changes.

## Definition of done

You can name the page file, the single controller hook, the composed
query/mutation hooks, their query keys, the repository method, and the
invalidation on success.
