# 06 — Frontend Queries and Cache

## Purpose

All server state flows through TanStack Query; client-only state flows through
Zustand. One caching model, one invalidation strategy, one place to look when
data is stale. This rule governs the data layer between hooks and the API.

## Applies to

`apps/claw-frontend/src/hooks/**`, `src/repositories/**`, `src/stores/**`.

## Mandatory rules

1. **TanStack Query for ALL server state** — every GET is a `useQuery`, every
   write is a `useMutation`, both wrapped in a hook (never called from `.tsx`).
2. **All API calls go through a repository** in
   `src/repositories/<domain>/<domain>.repository.ts`. Hooks call repositories,
   not `fetch`/the http-client directly.
3. **Query keys come from the factory** in `src/repositories/shared/query-keys.ts`
   — never an inline array literal in a hook.
4. **Mutations invalidate on success.** `onSuccess` invalidates the affected
   query keys; `onError` surfaces the failure (see [05](05-frontend-components-and-hooks.md)).
5. **Zustand only for minimal client state** — auth, sidebar, log filters. Never
   mirror server data into a store.
6. **Derive, don't duplicate.** If a value can be computed from query data, derive it.
7. **FE filter types are the exact intersection of BE-accepted keys.** When the BE
   Zod schema is `.strict()`, a superset filter (a "dead" field) 400s the request.

## Prohibited patterns

- `fetch()` or the raw http-client inside a hook or component.
- Inline query keys like `useQuery({ queryKey: ['threads', id], … })`.
- Server data copied into a Zustand store.
- A filter field the BE `.strict()` schema does not accept.

## Correct pattern

```ts
// src/repositories/chat/chat.repository.ts  — the only place the API is called
export const chatRepository = {
  listThreads: () => httpClient.get<ThreadList>('/api/v1/chat-threads'),
};
// src/repositories/shared/query-keys.ts
export const chatKeys = { threads: () => ['chat', 'threads'] as const };
// src/hooks/chat/use-threads.ts
export function useThreads() {
  return useQuery({ queryKey: chatKeys.threads(), queryFn: chatRepository.listThreads });
}
```

## Enforcement

- **ESLint** (frontend) — restricts `useQuery`/`useMutation` outside hooks and
  bans inline constants (query keys) in hook files.
- **TS config** — strict FE filter types catch superset keys at typecheck.
- **Unit test** (Vitest) — invalidation and error handling asserted.

## Related skills

- [03-feature-scaffold](../skills/03-feature-scaffold.md)

## Related context

- Root `CLAUDE.md` — "State Management Rules", "How to Add a New Frontend Feature".

## Definition of done

- [ ] Every server read/write is a Query/Mutation inside a hook.
- [ ] All API calls go through a repository; keys from the factory.
- [ ] Mutations invalidate on success and surface errors.
- [ ] FE filter type matches the BE `.strict()` schema exactly.
