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
8. **An invalidation must match the key the page actually queries.** Keys match
   by array **prefix**, so a longer key never matches a shorter one and a
   trailing `undefined` matches nothing:

   ```ts
   threads.messages(id); // ['threads','messages',id,undefined]
   threads.messages(id, 1); // ['threads','messages',id,1]        — no match
   threads.messagesInfinite(id); // ['threads','messages-infinite',id] — no match
   ```

   Send, regenerate and message-feedback all invalidated the first while the
   thread page queried the third and ten orchestration hooks queried the second.
   All three mutations invalidated **nothing**, and the list stayed fresh only
   because a 2-second timer was re-downloading the whole conversation. This is
   the failure mode to look for whenever removing a poll "breaks" the UI: the
   poll was covering for a dead invalidation.

9. **When one resource has more than one cached view, invalidate through one
   named function**, not by hand at each call site. `invalidateThreadMessages`
   is the example. Two invalidations written out three times is three chances
   to write one of them.
10. **A query that refetches on a timer must forward its `AbortSignal`.**
    `invalidateQueries` defaults to `cancelRefetch: true`, so a tick that lands
    mid-flight abandons the previous request — and without the signal
    "abandons" means the response is ignored while the request completes
    anyway. That is what produced two identical responses milliseconds apart.
    The signal has to be threaded hook → repository → api-client.

## Prohibited patterns

- `fetch()` or the raw http-client inside a hook or component.
- Inline query keys like `useQuery({ queryKey: ['threads', id], … })`.
- Server data copied into a Zustand store.
- A filter field the BE `.strict()` schema does not accept.
- An invalidation key that does not prefix-match any key a mounted query uses.
- A second cached view of a resource with no single function invalidating both.
- A polling or interval-refetched query whose `queryFn` drops the `signal`.
- A `setInterval` that invalidates a query. The query owns its own
  `refetchInterval`; a timer beside it is a second driver that beats against
  the first.

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
- **Unit test** —
  `src/utilities/__tests__/invalidate-thread-messages.utility.test.ts` asserts
  the prefix-matching rule directly: that the two message namespaces do not
  match each other, that the old key matched neither, and that the helper
  invalidates both. The original bug was invisible at every other level, because
  the mutation ran and the invalidation ran.
- **Unit test** — `src/hooks/chat/__tests__/use-thread-detail.test.tsx` asserts
  no invalidation happens on a timer while a response is in flight, and that the
  wait ends at its deadline.

## Related skills

- [03-feature-scaffold](../skills/03-feature-scaffold.md)

## Related context

- Root `CLAUDE.md` — "State Management Rules", "How to Add a New Frontend Feature".

## Definition of done

- [ ] Every server read/write is a Query/Mutation inside a hook.
- [ ] All API calls go through a repository; keys from the factory.
- [ ] Mutations invalidate on success and surface errors.
- [ ] FE filter type matches the BE `.strict()` schema exactly.
