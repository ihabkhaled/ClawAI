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
4. **Mutations invalidate on success — unless the response IS the cache.**
   `onSuccess` invalidates the affected query keys; `onError` surfaces the
   failure (see [05](05-frontend-components-and-hooks.md)). But when a mutation's
   response body is already the exact row the affected query would refetch —
   `POST /chat-messages` returns the full persisted message, id and
   `createdAt` included — invalidating it anyway means discarding that
   response and paying a second round trip to ask the network for the same
   object back. `useSendMessage` used to do exactly this: the sent message was
   invisible until a poll re-fetched the thread. Write the response straight
   into the cache with `setQueryData` instead (`insertSentMessageIntoCache` is
   the pattern), and reserve invalidation for mutations whose response is NOT
   the full picture — `regenerate` returns a message but changes what exists
   downstream of it, which invalidation, not a hand-written cache patch, is
   the safe way to express.

   This is **not** an optimistic update and carries none of that pattern's
   risk: there is nothing to guess and nothing to roll back, because the data
   being written already came from the server. Guard it exactly like the
   pattern above still requires — idempotent against a concurrent refetch
   (check the id is not already present) and a no-op when nothing is cached
   yet, so a send racing the very first page load does not fabricate a page
   shape that disagrees with the real one when it arrives.

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
10. **Polling is opt-in, per query, and named.** There is no global
    `refetchInterval` and there must never be one again: in TanStack v5 it
    ignores `staleTime`, so a global timer polls pure configuration, the
    signed-in user's profile, and endpoints that answer 502 wherever an optional
    local runtime is absent. Measured cost of the one that existed: ~83 requests
    per minute on an idle chat page.

    Classify each query by one question — _can this data change without the
    person looking at it doing anything, and are they expected to watch it
    change?_ — and use the matching tier from
    `constants/query-policy.constants.ts`:

    | Tier           | Both true?                                | Setting                                          |
    | -------------- | ----------------------------------------- | ------------------------------------------------ |
    | **LIVE**       | yes and yes                               | `QUERY_POLL_LIVE_MS` / `QUERY_POLL_LIVE_SLOW_MS` |
    | **BACKGROUND** | changes, but nobody waits on a row        | `QUERY_POLL_BACKGROUND_MS`                       |
    | **EVENT**      | no — a mutation or an SSE event causes it | no interval; invalidate                          |
    | **CONFIG**     | reference data                            | `QUERY_STALE_CONFIG_MS`, no interval             |
    | **SESSION**    | own profile / entitlements / wallet       | `QUERY_STALE_SESSION_MS`                         |

    Never a bare number. `refetchInterval: 5000` is a value nobody can grep for
    and nobody can change in one place; the tier carries the reasoning.

    **Removing a poll is dangerous in one specific way**: a LIVE query with no
    interval goes stale with no error, no failed render and no console warning.
    Before removing any timer, ask what tells this view its data changed. If the
    answer is "nothing", it is LIVE and needs an interval — see rule 8 for the
    case where the answer _looked_ like an invalidation and was not.

11. **A query that refetches on a timer must forward its `AbortSignal`.**
    `invalidateQueries` defaults to `cancelRefetch: true`, so a tick that lands
    mid-flight abandons the previous request — and without the signal
    "abandons" means the response is ignored while the request completes
    anyway. That is what produced two identical responses milliseconds apart.
    The signal has to be threaded hook → repository → api-client.

12. **`refetchInterval` on an infinite query refetches every loaded page, on
    every tick — target one page directly instead when only one can change.**
    TanStack Query does not expose a supported way to limit an infinite
    query's automatic interval refetch to a subset of its loaded pages; on a
    background tick it always refetches every page currently in the cache,
    sequentially, from the newest forward. "Page 1" below means the first
    element of the cached `pages` array (the newest page) — the messages
    endpoint takes a cursor (`before`), not a `page` number; fetching "page 1"
    means calling it with no cursor at all. `useVirtualizedMessages` polls
    while a response is in flight, and a new message only ever lands on the
    newest page (`orderBy: createdAt desc`) — so once a thread's history had
    been scrolled back through, each 5s tick was re-pulling every page loaded
    so far to catch a change that could only ever appear on the first one.

    The fix is a dedicated `setInterval` that fetches the newest page directly
    through the repository (no cursor) and merges it into the cache with
    `setQueryData` (`mergeLatestMessagesPageIntoCache` is the pattern), with
    `refetchInterval: false` on the query itself. This is **not** the
    prohibited pattern below — that one bans a `setInterval` that
    **invalidates** a query, creating two drivers racing each other. This is a
    single driver that writes directly, same as rule 4's authoritative-response
    write, applied to a poll instead of a mutation response.

    Guard it with an ordering check before writing: a page fetched earlier can
    still resolve after one fetched later (retry, network jitter). Compare a
    monotonically increasing field the response carries — `meta.total` for the
    messages list, since it only grows — and drop a response reporting a lower
    value than what is already cached instead of letting a stale response
    overwrite fresher data.

13. **Prefer a cursor over an offset for any list a client paginates while the
    underlying rows can grow.** `chat-messages`'s list endpoint used
    `skip = (page-1)*limit` over `orderBy createdAt desc`: inserting a row
    between two page fetches shifts what "page 2" means, so the message that
    used to end page 1 becomes the message that starts page 2 — a client
    holding both duplicates it, or drops it if only page 2 is re-fetched. A
    cursor keyed to a specific row's id (`before`, matched with Prisma's
    native `cursor: { id }, skip: 1`) has no such window: "everything before
    this exact row" means the same thing regardless of what gets inserted
    above it. This is why the messages endpoint takes `before`, not `page` —
    see [B8 in the chat-pipeline audit](../docs/14-risk-debt/chat-pipeline-audit-2026-09.md)
    for the incident this closed. The same drift is theoretically possible on
    any offset-paginated, growable list — `chat-threads` is left offset-
    paginated for now because nothing drives a concurrent multi-page refetch
    against it the way the awaiting-response poll did against messages, not
    because the underlying mechanism can't occur there. Revisit it the same
    way if that ever changes.

## Prohibited patterns

- `fetch()` or the raw http-client inside a hook or component.
- Inline query keys like `useQuery({ queryKey: ['threads', id], … })`.
- Server data copied into a Zustand store.
- A filter field the BE `.strict()` schema does not accept.
- An invalidation key that does not prefix-match any key a mounted query uses.
- A second cached view of a resource with no single function invalidating both.
- A polling or interval-refetched query whose `queryFn` drops the `signal`.
- A global `refetchInterval` on the QueryClient, at any value.
- `refetchInterval` written as a literal number instead of a tier constant.
- Removing a timer from a query whose data changes server-side, without adding
  another mechanism that tells it so.
- A `setInterval` that invalidates a query. The query owns its own
  `refetchInterval`; a timer beside it is a second driver that beats against
  the first. (A `setInterval` that fetches one page directly and merges it
  with `setQueryData`, with the query's own `refetchInterval` turned off, is
  rule 12's pattern, not this one — there is exactly one driver either way.)
- Merging a polled response into the cache with no ordering guard, so a
  response that resolves out of order can overwrite fresher data with stale.

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

| Mechanism     | What it checks                                                                                                                                                                                                                                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit test** | `src/utilities/__tests__/insert-sent-message-into-cache.utility.test.ts` — prepends to the newest page, increments `total` while leaving the pagination cursor (`nextBefore`) untouched, leaves other pages untouched, no-ops on an empty cache, and is idempotent.                                                                          |
| **Unit test** | `src/hooks/chat/__tests__/use-send-message.test.tsx` — a successful send writes to the cache and does NOT invalidate `messagesInfinite`, while still invalidating `messagesAnyPage` for the poll hooks.                                                                                                                                      |
| **Unit test** | `src/utilities/__tests__/merge-latest-messages-page-into-cache.utility.test.ts` — replaces only the newest page, drops a response reporting a lower `meta.total` than what is cached, no-ops on an empty cache.                                                                                                                              |
| **Unit test** | `src/hooks/chat/__tests__/use-virtualized-messages.test.tsx` — the awaiting-response poll fetches the newest page only, with no cursor (never every loaded page), does not run while idle, folds into `isFetching`, dedupes a message id reaching two pages, and requests the next older page using the previous page's `nextBefore` cursor. |
| **Unit test** | `apps/claw-chat-service/src/modules/chat-messages/__tests__/chat-messages.service.spec.ts` — `getMessages` forwards `before` unchanged, sets `nextBefore` to the oldest returned message's id only on a full page, and returns `null` on a short one.                                                                                        |

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
- **Unit test** — `src/app/__tests__/query-policy.test.ts` asserts that the
  QueryClient sets no global `refetchInterval`, that the default `staleTime` is
  the named constant, and that every query on the LIVE list still declares an
  interval from a tier. That list is the record of which views break silently if
  their timer is dropped.
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
