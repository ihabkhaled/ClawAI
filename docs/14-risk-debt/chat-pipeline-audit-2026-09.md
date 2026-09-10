# Chat pipeline — architecture audit and root-cause map, 2026-09-10

> Claim-versus-code audit of the chat pipeline, written before any of the
> remediation is implemented. Every finding names the file and line that causes
> it. Measurements live in
> [`chat-pipeline-baseline-2026-09.md`](chat-pipeline-baseline-2026-09.md).
>
> **Nothing here is a fix.** This document exists so the fixes are aimed at
> causes rather than symptoms, and so the ones that turn out to be expensive can
> be sequenced rather than discovered halfway through.

## How to read this

Findings are grouped by subsystem and ranked within each group. Every finding
carries a confidence: **certain** (read directly off the code), **high**
(strongly implied by the code and consistent with a measurement), **medium**
(plausible mechanism, not yet reproduced).

A finding marked **measured** has a number behind it in the baseline document.
A finding marked **not reproduced** is a code reading that the audit could not
trigger on demand — those are the ones most likely to be wrong.

---

## When to stop trusting this document

Every finding below is anchored to an exact file and line, and the first
remediation batch will move those lines. Treat the **mechanism** as durable and
the **coordinates** as perishable.

Before relying on a specific citation, check TD-030 in
[`technical-debt.md`](technical-debt.md) for what has already been fixed. A
finding marked done there has almost certainly moved or gone.

Re-measure rather than re-read when the question is "is this still true?" —
[`skills/measure-chat-network-baseline.md`](../../skills/measure-chat-network-baseline.md)
is the procedure.

---

## A. Idle network traffic — **FIXED 2026-09-10**

**The whole of it is one line.**

```ts
// apps/claw-frontend/src/app/providers.tsx:20
refetchInterval: 10 * 1000,
```

A **global** `refetchInterval` on the QueryClient's default query options. In
TanStack Query v5 `refetchInterval` ignores `staleTime` — it is an unconditional
timer. Every query in the application inherits it unless it opts out, and nine
of the ten endpoints in the original report do not.

This is why `/auth/me` refetches every 10 seconds despite a 5-minute
`staleTime`, and why `/connectors/available-models` and `/files` — pure
configuration — behave like live data. Measured cadence: 10.0 s, gaps of
10.2 / 10.0 / 10.0 / 10.1 / 10.1.

| #   | Finding                                                                                                     | Cause                                                                                                                                                  | Confidence            |
| --- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| A1  | Nine endpoints poll at 10 s                                                                                 | Global `refetchInterval` at `providers.tsx:20`                                                                                                         | **certain, measured** |
| A2  | `/files` costs a full 4.3 MB serialisation every 10 s per tab                                               | `useFiles` (`hooks/files/use-files.ts:13`) inherits A1; Express computes its ETag _after_ the handler runs, so the 304 saves the wire and nothing else | **certain, measured** |
| A3  | `/connectors/available-models` has **three** concurrent observers on the thread page                        | two `useJudgeModelOptions` paths (thread settings, in-thread compare) plus `useModelSelector`                                                          | **high**              |
| A4  | `/auth/me` has three concurrent observers app-wide                                                          | `use-preference-bootstrap.ts:13`, `user-menu.tsx:23`, `use-password-rotation-guard.ts:25`                                                              | **high**              |
| A5  | Each observer owns its own timer, so N observers drift into up to N fetches per window                      | v5 `QueryObserver` semantics                                                                                                                           | **high**              |
| A6  | The thread page mounts ~20 query observers over ~12 distinct keys                                           | traced through `useThreadDetailPage`                                                                                                                   | **high**              |
| A7  | `/chat-threads` infinite list polls on the thread page purely to feed a drawer that is invisible on desktop | `ThreadListDrawer` in `chat-thread-shell.tsx`                                                                                                          | **high**              |
| A8  | `/chat-threads/{id}/share` polls for a dialog that is closed, for state only this user can change           | `use-chat-share.ts:19` mounted in the always-on controller                                                                                             | **high**              |

**Already known internally.** Three hooks carry comments naming this exact
trap, e.g. `hooks/ollama/use-local-models.ts:23-26`: _"retry:false alone does
not stop the app-wide 10s refetchInterval default (providers.tsx)"_. The
knowledge existed; the default did not change.

`/health` at 30 s (`use-service-availability.ts:14`) is the one deliberate poll
in the set and the smallest contributor.

> **Fixed.** The global `refetchInterval` is gone and the default `staleTime` is
> now 60 s rather than 5 s. Polling is opt-in per query from a named tier in
> `constants/query-policy.constants.ts`. Twenty-six queries whose data genuinely
> changes server-side were identified first and given explicit intervals, so
> nothing froze silently — that list is asserted in
> `app/__tests__/query-policy.test.ts`.
>
> `/files` (A2) got a **conditional** interval rather than a fixed one: it polls
> only while a file is mid-ingestion, because the response is 4.2 MB and the
> common case is that every file is already ingested.
>
> Measured on the same page, idle for 38 s: **1 request, `/health`** — the one
> deliberate poll. **83 requests/minute → 2.** `/files` server-side
> serialisations per idle minute: **6 → 0**.

---

## B. Conversation synchronisation

### B1 — Page 1 _is_ the whole conversation (**certain**)

`MESSAGES_PAGE_SIZE = 50`, and the backend applies no projection:
`chat-messages.repository.ts:37-45` selects every column including full
`content`, `originalContent` and the `metadata` JSON blob.

Below 50 messages, `?page=1&limit=50` returns the entire thread in full. Every
refetch re-downloads all of it. **That is the 91 KB → 212 KB curve exactly**:
same URL, same page number, monotonically larger body, because page 1 is not a
window onto the conversation until the conversation outgrows it.

### B2 — Two independent refetch drivers on one query — **FIXED 2026-09-10**

- `use-thread-detail.ts:107-145` — a manual `setInterval` invalidating the
  messages key every `POLLING_INTERVAL_MS` (2000 ms) for up to
  `POLLING_MAX_TICKS` (300) ticks = **10 minutes**.
- `use-virtualized-messages.ts:43` — `refetchInterval: MESSAGE_POLL_INTERVAL_MS`
  (5000 ms) on the same query.

Both are gated on the same flag, so while it is set the same infinite query has
a 2 s driver and a 5 s driver beating against each other. Measured: a dead
regular 2000 ms cadence, 28.5 KB per response.

> **Fixed.** The 2-second `setInterval` and its `POLLING_INTERVAL_MS` /
> `POLLING_MAX_TICKS` constants are deleted. `MESSAGE_POLL_INTERVAL_MS` (5 s) is
> now the only network driver while a response is in flight, bounded by a single
> `RESPONSE_WAIT_TIMEOUT_MS` deadline instead of a tick counter. Measured after:
> gaps of 5215 / 5012 / 5012 / 5022 / 5010 ms — one driver, no beating.

### B3 — The duplicate simultaneous fetch — **FIXED 2026-09-10**

`invalidateQueries` defaults to `cancelRefetch: true`, so the 2 s tick cancels
an in-flight 5 s fetch and starts another. But `apiClient.get`
(`services/shared/api-client.ts:28-35`) **never forwards an `AbortSignal`** —
only `post` accepts one. The cancelled request therefore stays on the wire and
completes. Two identical `page=1&limit=50` responses land milliseconds apart.
That is the reported duplicate, and it is a two-line asymmetry in the API client.

> **Fixed.** `apiClient.get` now accepts and forwards `options.signal`, and the
> messages query threads TanStack's `signal` through the repository. Measured
> after: no near-simultaneous pairs — every observed gap is a clean ~5010 ms.

### B4 — The waiting flag arms itself — **FIXED 2026-09-10**

`use-thread-detail.ts:175-193`: if the last message in the transcript is a
`USER` message and the current signature differs from a suppression signature,
"waiting" re-arms. The suppression signature at `:76-79` is computed from
**pre-refetch** data, so it frequently fails to match what arrives.

Consequence: any thread whose last row is a user turn — a failed run, a
cancelled run, a run whose assistant row is not yet visible — re-arms the
10-minute 2-second loop **on every page load, with no user action**. The
baseline's second measurement is exactly this state: 148 requests/minute on a
thread abandoned ten days earlier.

> **Fixed.** Arming is now idempotent per transcript signature, recorded at ARM
> time rather than compared against a signature computed from pre-refetch data.
> A transcript already armed for is never armed for twice, so the completion
> effect and the recovery effect can no longer drive each other. This also
> breaks D1's abort loop from the client side.

### B5 — Streamed tokens are never written to the cache (**high**)

There is no `setQueryData` anywhere in `hooks/chat/` — verified by grep, zero
hits. Deltas accumulate in refs and a separate `streamLive` state rendered in
the list _footer_. On `DONE`, that buffer stops being authoritative and the
entire thread is re-downloaded to materialise the one message that just
streamed. **Every completed answer costs one full-conversation download.**

### B6 — Three uncoordinated copies, no normalized store (**certain**)

The conversation exists in the TanStack cache, in SSE component state, and in
derived waiting state, plus a fourth query for thread metadata. `src/stores/`
holds auth, log and sidebar only. There is no message store and no
normalisation by id.

There is also **no optimistic insert on send** — `use-send-message.ts` has no
`onMutate`, so the user's own message is invisible until a poll fetches it.
That absence is a direct cause of how aggressive the polling had to be.

### B7 — Invalidations aimed at a key nothing queries — **FIXED 2026-09-10**

`query-keys.ts:36-39` defines two non-prefix-matching namespaces:
`threads.messages(...)` and `threads.messagesInfinite(...)`. The page queries the
infinite one. Send, regenerate and message-feedback all invalidate the _other_:
`use-send-message.ts:35`, `use-regenerate-message.ts:21`,
`use-message-feedback.ts:23`.

So the three mutations that change the conversation do nothing to the list that
renders it. The timers are load-bearing precisely because the correct
invalidation never fires. **Fixing the polling without fixing this key mismatch
would make the UI stop updating** — the two must land together.

> **Fixed.** All three mutations now call `invalidateThreadMessages`, which
> invalidates both the infinite key and a new three-element `messagesAnyPage`
> prefix that matches every page variant. The prefix-matching rule itself is
> asserted in a test, and is now rule 06 §8–§10.

### B8 — Offset pagination over a head-growing list (**medium**)

`skip = (page-1)*limit` over `orderBy createdAt desc`
(`chat-messages.repository.ts:38-43`). Refetching pages 1 and 2 while a run
appends rows shifts the window between the two requests, duplicating or dropping
messages in the merged array.

### B9 — Refetching an infinite query refetches every loaded page (**high**)

`maxPages` is explicitly `undefined` (`use-virtualized-messages.ts:45`). Once a
user scrolls back through history, each refetch pulls _all_ loaded pages
sequentially. The cost steps up per page loaded.

### B10 — No ordering guard on the REST path (**high**)

The SSE path has both a `sequence` ordering guard and an event-id dedup
(`use-chat-stream.ts:133-146`). The REST path has neither. Nothing compares
timestamps, counts or a version token before accepting a thread payload, so a
late response can overwrite newer streamed content — and, via B4, re-arm the
polling loop.

---

## C. Client telemetry

> **Status 2026-09-10 — FIXED, except C4 in part.** C1, C2, C3, C5, C6 and C8 are
> closed by the telemetry batch (`POST /client-logs/batch`, collapse-with-count, severity
> gate, `pagehide` beacon, buffer cap, refresh-flow exemption, and the removal
> of the self-feeding log on the client-logs page). C7's amplification falls out
> of C2: the ingest path now logs once per batch instead of ~4x per event.
> **C4 is only partly closed** — dedup and the unload flush landed; sampling and
> retry did not, and a failed batch is still dropped by `.catch(() => {})`. See
> [ADR-089](../13-adr/adr-089-client-telemetry-batch-endpoint.md). The findings
> below are kept as written, because the measurement that motivated each one is
> the evidence that the fix was needed.

### C1 — The buffer delays but does not batch (**certain, measured**)

```ts
// apps/claw-frontend/src/utilities/logger.utility.ts:11-20
const batch = [...logBuffer];
logBuffer = [];
for (const entry of batch) {
  httpClient.post('/client-logs', entry).catch(() => {});
}
```

A 5-second timer accumulates entries and then issues **one HTTP request per
entry** in a synchronous loop. The burst is not incidental — the timer
manufactures it. Measured: 92 requests, one per log line.

### C2 — The backend accepts a single object only (**certain**)

`create-client-log.dto.ts:3-20` is a flat `z.object` enforced by a
`ZodValidationPipe`. An array body is rejected with a 400. There is no `/bulk`
route, and `insertMany` appears nowhere in the service.

**This is the sequencing fact for the whole telemetry workstream**: batching is
not a frontend change. It needs an array-accepting schema, a service method
taking a list, and a repository `insertMany`, shipped before or with the client.

### C3 — No severity gate at all (**certain**)

`logAtLevel` (`logger.utility.ts:133-137`) has no level comparison, and
`LogLevel` (`enums/log.enum.ts`) is an unordered string enum, so no comparison is
even possible today. All 46 `logger.debug` sites ship to production and cross
the network. Because they sit inside `queryFn`s, they are the majority of the
volume.

### C4 — No sampling, dedup, throttling or retry (**certain**)

`.catch(() => {})` drops failures silently, and there is no `sendBeacon` or
`pagehide` flush, so anything buffered when the user navigates is lost. The
server _does_ throttle (2500/60 s), so a client burning one quota unit per log
line can be throttled into silent loss.

### C5 — Telemetry can log the user out (**medium, latent**)

Log POSTs share the auth-refresh interceptor (`lib/http-client.ts:43-107`). A
401 on a telemetry write enters the refresh flow and, on failure, forces
`window.location.href = '/login'` (`:97-101`). The endpoint is `@Public()`
today, so this is latent rather than live — but a telemetry write should never
hold that authority.

### C6 — Bursts get replayed and doubled (**medium**)

Log POSTs queued during an in-flight refresh all re-fire together
(`http-client.ts:60-67`).

### C7 — Server amplification ≈ 4× (**high**)

Each single-event POST produces roughly four server log lines (interceptor +
service debug/log + repository debug/log) and one Mongo `save()`.

### C8 — Viewing the client-logs page generates client logs (**certain**)

`hooks/logs/use-client-logs.ts:12` logs inside the `queryFn` that fetches client
logs. Not infinite, but the table is never empty and grows while watched.

**Ruled out** — worth recording so it is not re-investigated: there is no
per-render logging (zero `logger.*` in components or page files) and no
per-token logging (`CONTENT_DELTA`/`REASONING_DELTA` do not log).

---

## D. Streaming

### D0 — What is exonerated (**high**)

Two suspects from the original report are innocent, and saying so is worth more
than another finding, because it stops the programme spending a batch there.

**nginx is correct.** `infra/nginx/locations.conf:127-135` sets
`proxy_http_version 1.1`, `Connection ""`, `proxy_read_timeout 86400`,
`proxy_buffering off`, `proxy_cache off`. Longest-prefix matching means this
block wins over the general `/api/v1/chat-messages` one. gzip appears nowhere in
`infra/nginx/`, so it is off by default. With a 15-second heartbeat there is no
idle-timeout exposure.

**There is no CORS misconfiguration on this route.** CORS is configured in
exactly one place (`claw-chat-service/src/main.ts:49-54`); nginx adds no
`Access-Control` header anywhere. In the standard deployment
`NEXT_PUBLIC_API_URL` and the app origin are both `https://claw.local`, so the
stream request is **same-origin and CORS does not apply at all**.

A "blocked by CORS policy" logged against a request DevTools also shows as
`200` plus `net::ERR_ABORTED` is Chrome mislabelling a connection that was cut
while its headers were being consumed. **The aborts are self-inflicted.**

One genuine CORS trap exists but is a different bug: the dev frontend also
publishes plain HTTP on `localhost:3000`
(`docker/docker-compose.dev.services.yml:685-686`), an origin absent from
`CORS_ORIGINS`. Browsing there produces a real, reproducible CORS failure on the
stream. If the QA session was on `localhost:3000` this explains it; on
`claw.local` it does not.

### D1 — The stale-`DONE` replay race — **FIXED 2026-09-10** — the actual cause

The transport is not `EventSource`. `sse.utility.ts:20-137` uses `fetch` plus a
manual `ReadableStream` reader, so there is no browser auto-reconnect and no
`Last-Event-ID`.

The loop, step by step:

1. `use-thread-data-controller.ts:69-70` calls `startWaitingForResponse()`
   **synchronously before** `sendMessage(...)`. The SSE connection opens before
   the POST has left the browser.
2. The stream URL carries no `replay=false`, so the server reads the Redis
   **replay buffer** first (`chat-stream.service.ts:569-576`).
3. That buffer still holds the **previous run's terminal `DONE`**. It is cleared
   only when the backend starts the new run (`chat-stream.service.ts:87`), and
   it lives for an hour. **Steps 1 and 3 race, and step 1 usually wins.**
4. The stale `DONE` reaches `use-chat-stream.ts:259-267` → `streamCompletedAt`.
5. `use-thread-detail.ts:60-88` invalidates both queries and sets
   `isWaitingForResponse = false`.
6. That flag is also the stream's `isActive`, so the effect cleanup runs and
   **aborts the connection it just opened** — a 200 that dies with
   `net::ERR_ABORTED`.
7. The invalidation lands. The transcript still ends in a `USER` message, and
   B4's stale suppression signature fails to match, so the re-arm effect sets
   waiting back to true.
8. Back to step 1.

> **Fixed.** `useChatStream` takes a `replayPastEvents` argument. An explicit
> send passes `false` — it has missed nothing, so the buffer is never read and
> the race cannot occur. Recovery after a reload still passes `true`, which is
> what replay exists for. The endpoint already accepted `?replay=false`; nothing
> server-side changed.

Each turn of that loop is one `GET .../stream/{threadId}` that returns 200 and
is aborted milliseconds later, and the reported "REST synchronisation takes
over" is the 2 s / 5 s / 10 s polls firing whenever the flag is briefly true.

The hazard is documented in the code itself — `chat-stream.service.ts:78-84`
describes this exact race. The mitigation was placed on the wrong side of it.

### D2 — A clean close is treated as permanent — **FIXED 2026-09-10**

`sse.utility.ts:49-52`: if the server ends the body cleanly, the utility marks
the stream `completed` and **deliberately never reconnects**.

But the server ends cleanly on any `assertOwnership` rejection
(`chat-stream.controller.ts:66-68`). So a single transient database blip during
an ownership check permanently downgrades that thread to REST polling for the
life of the page. Backoff exists (`1s × 2ⁿ`, capped 15 s, 10 attempts) and is
skipped in precisely the case that most needs it.

> **Fixed.** `connectSse` now asks the consumer through
> `shouldReconnectAfterClose`, because only the consumer knows whether it saw a
> terminal event. The default is to reconnect — assuming the stream finished is
> the failure that was already paid for.

### D3 — Degradation is silent (**high**)

`useChatStream` passes no `onReconnect`, and its `onError` only calls
`logger.warn` — `streamError` is never set, and "reconnect attempts exhausted"
reaches nothing user-visible. The UI cannot distinguish a dead stream from a
quiet one, which is why the failure was found by reading DevTools rather than by
the product saying so.

### D4 — Event IDs exist but in the wrong namespace (**high**)

Nest auto-assigns `id:` from a **per-connection counter starting at 1**. The
application's real identifier is the Redis-stamped `"<threadId>:<sequence>"`.
They are unrelated, so the wire IDs carry no resumable information.

`Last-Event-ID` is handled by neither side: the client sends only `Accept` and
`Authorization` and discards every non-`data:` line; the controller reads no
such header. Recovery is therefore always "replay the whole buffer", never
"resume from N".

### D5 — The dedup guard cannot survive a reconnect (**high**)

`resetStream()` clears `processedEventIdsRef` on **every** effect run, so the
`eventId` dedup works only _within_ one connection. It is defeated by exactly
the replay a reconnect triggers — which is what lets D1's stale `DONE` be
re-processed each cycle.

### D6 — StrictMode adds one spurious abort per mount (**high, dev only**)

`reactStrictMode: true` double-mounts the effect: open, abort, open. One extra
200-then-aborted stream request per page load in development. Not a production
cause, but it inflates every dev observation of D1.

### D7 — A latent teardown tripwire (**medium**)

`t` from `useTranslation` sits in the stream effect's dependency array, and its
stability depends on the identity of an RSC-supplied dictionary object. Any
layout re-render that hands down a fresh object closes and reopens the stream.
Not triggered on the chat route today.

### D8 — Minor (**high**)

A backoff `sleep()` adds an `abort` listener per attempt and never removes it
(bounded at 10). `use-chat-stream.ts:321-326` is dead code. The chat nginx block
omits an `X-Accel-Buffering` `proxy_set_header` its sibling blocks carry — that
directive is a misuse in the siblings anyway, since it is a response header, and
Nest emits the real one.

---

## E. Search, fetch and source truthfulness

> **Status 2026-09-10 — E0, E1, E3, E4, E6, E8 and E9 FIXED; E2, E5 and E7 still
> open.** A URL in the prompt is now detected and fetched directly, before the
> search step, through the same `FetchService` (so the SSRF guard and domain
> policy are unchanged); it outranks anything discovered, and it is never
> fetched twice. A `SEARCH_ONLY` run names the links it did NOT open rather than
> silently ignoring them. The prompt's capability statement is triggered by
> research being **requested** rather than by it having produced something, so a
> run that failed cleanly now says so instead of leaving the model to refuse
> from its prior — and it names the tools that ran, including
> `web_fetch:user_url`, so evidence arrives with provenance.
>
> Verified live: `summarize https://example.com/ for me` produced
> `toolsUsed: [web_fetch, web_fetch:user_url, web_search, search:serpapi]`,
> trace `fetch.direct` **before** `search`, and `https://example.com/` as item
> one at confidence 1. The same prompt under `SEARCH_ONLY` fetched nothing and
> warned by name. See
> [ADR-091](../13-adr/adr-091-user-urls-are-opened-not-searched.md) and
> [rules/41](../../rules/41-web-evidence-truthfulness.md).
>
> **E4 closed separately**: the badge now reports pages READ, derived from each
> evidence item's own `source` field, with links found shown as a second number
> and the search/fetch counts derived from `toolsUsed` instead of being
> hardcoded zeros. A message written before the counts existed falls back to a
> neutral "{n} sources" and hides the request badges entirely, because a zero
> reads as a measurement. `extracted` is no longer dropped, so the expander can
> show extracted text on the normal chat path.
>
> **E8 closed**: the shared `Button` now defaults to `type="button"`. A scan of
> every `<form>` in the frontend found no button relying on the implicit submit,
> so the change is behaviour-preserving today and protective from here.
>
> **E9 closed**: `runEnricherTranscript` and its two transcript builders are
> deleted, along with the now-unused `ResearchEnricherManager` injection in
> chat-messages.service. The manager itself stays — the orchestration managers
> do use it.
>
> **Still open**: E2 (path B never tells the model research ran), E5 (the
> provider dropdown is decorative on compare and the nine orchestration modes),
> E7 (a prompt over 500 characters 400s the search and disables research
> silently).

### E0 — The finding that reframes the rest (**high**)

**ClawAI has no "read the URL the user pasted" capability.**

Not a broken one. There is no code path anywhere that takes a URL out of a user
prompt and fetches it.

This is not for want of a fetcher. `FetchService.fetchPage`
(`claw-research-service/src/modules/fetch/services/fetch.service.ts:30-71`) is
real, has SSRF and domain policy, caches, and returns `{finalUrl, title,
content, rawHtml, links, byteSize}`. `ScrapeService.extract` has article, docs,
table and generic-HTML extractors. `POST /research/fetch` is a live route.

Both are wired **exclusively downstream of a keyword search**. Every caller of
`fetchPage` feeds it URLs the _search engine_ returned:

- `research.manager.ts:160-166` — `searchItems.slice(0, EVIDENCE_FETCH_TOP_N)`
- `research-enricher.manager.ts:284-289` — `searchResults.slice(0, topFetch)`

So `summarize https://example.com/x` becomes a **search query containing a URL**.
The search engine returns whatever it returns, and the top three of _those_ are
fetched. The page the user asked for is never opened unless the search engine
happens to return it.

### E1 — URL detection: absent, and the scaffolding for it throws (**high**)

A full grep across chat, research, agent and routing services found no URL
detection in the request path. What exists:

| Artifact                                                                                                                                       | State                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `classifier/.../URL_REGEX`                                                                                                                     | Live, but only tags `WEB_INPUT` for **model capability matching**. Triggers no fetch. |
| `modality-detection/constants/web-url.constants.ts` — `HTTP_URL_REGEX`, `WEB_SUMMARIZE_VERBS` (`summarize`, `read`, `fetch`, `scrape`, `tldr`) | **Dead constants.** Zero references outside `dist/`.                                  |
| `modality-detection/managers/url-intent.manager.ts:11-16`                                                                                      | `throw new Error('SCAFFOLD-R2 — UrlIntentManager.detect not implemented')`            |
| `modality-detection/services/modality-detection.service.ts`                                                                                    | Same `SCAFFOLD-R2` throw. Never called from chat-service.                             |

Somebody designed this feature — the verb list is exactly right — and it was
never built. A changelog reading of this repo would say URL intent detection
exists.

Nor is the decision "left to the model": on the main chat path the model is
given **no fetch tool at all**. The only tool loop is Ollama-Cloud-specific.

### E2 — Two orchestration paths, and only one behaves (**high**)

|                                     | Path A: single message                                                               | Path B: compare + 9 orchestration modes                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Entry                               | `chat-messages.service.ts:186-193` → `research-client.utility.ts` → `/research/runs` | `research-enricher.manager.ts` → `/research/search` + `/research/fetch` |
| Sends chosen provider?              | **Yes**                                                                              | **No** — dropped twice                                                  |
| Tells the model search already ran? | **Yes**                                                                              | **No**                                                                  |

Path B's entire capability statement to the model is one line:

```ts
// research-enricher.manager.ts:376-379
const header = `## Web research evidence (mode: ${mode}, gathered now)`;
```

That file's own header comment says its purpose is to stop models "refusing with
'I can't browse the web'". The prompt it emits does not attempt it.

### E3 — Why the refusal also happens on the good path (**high**)

Path A does say the right thing (`context-assembly.manager.ts:829-836`):
_"The web search and browsing steps have already been completed for you… Do not
say that you can't browse the web."_

But the block is **conditional**: it is only pushed when
`researchEvidence.length > 0 || researchWarnings.length > 0`
(`:409-411`, `:582-584`). Every upstream failure is swallowed to `null`
(`research-client.utility.ts:43-56`). A research run that fails cleanly produces
zero items _and_ zero warnings, so the model is told nothing at all and answers
from its training prior — "I can't browse".

**The refusal is loudest exactly when research failed**, which is the moment the
user most needs the truth.

### E4 — "Used 4 sources" counts search hits, not pages read (**high**)

`research-transcript-panel.tsx:31` renders `transcript.sources.length`. That
array is the deduped `bundle.items`, which mixes search hits and fetch results
and collapses them by URL.

For `SEARCH_FETCH_EXTRACT`, `maxResults` defaults to **4**. Fetch tops out at
`EVIDENCE_FETCH_TOP_N = 3`, and every fetch failure is downgraded to a warning
(`research.manager.ts:181-185`). So "Used 4 sources" is emitted when four links
were _discovered_ and **zero** may have been read.

That is the precise mechanism behind the reported contradiction: the count comes
from the search, the refusal comes from the missing capability statement, and
neither knows about the other.

Two more truthfulness defects in the same panel:

- `chat-messages.service.ts:1718-1719` **hardcodes** `searchRequestCount: 0,
fetchRequestCount: 0`, so the badges read "0 search requests / 0 fetch
  requests" directly under "Used 4 sources".
- `toTranscriptSource` (`:1723-1734`) drops `extracted` entirely, so the "Show
  sources" expander can never display extracted text on the normal chat path.

### E5 — The provider dropdown is decorative on every non-single-message flow (**high**)

Dropped twice, independently:

1. `chat-messages.service.ts:493-497` builds the parallel research options and
   never reads `dto.researchProviderId`; `ParallelResearchOptions`
   (`types/parallel.types.ts:79-84`) has no such field.
2. Managers that _do_ pass it get no further: `ResearchEnrichInput` has no
   `providerId`, and the outbound body is literally
   `{ query, maxResults }` (`research-enricher.manager.ts:299-305`).

`search-execution.service.ts:238-259` then takes the AUTO branch and picks the
top of a hardcoded score map. **The transcript still records the provider the
user chose** — so the UI reports a provider that did not run.

### E6 — The model is never told which tools ran (**high**)

`bundle.toolsUsed` (`web_search`, `web_fetch`, `web_extract`, `scrape:article`)
is populated and emitted over SSE, but never read by `extractEvidenceCitations`
or printed by `formatResearchBlock`. The model receives evidence with no
provenance about how it was obtained.

### E7 — Long prompts silently disable research (**medium**)

The query is capped at `SEARCH_MAX_QUERY_LENGTH = 500`. A longer prompt 400s,
`runResearch` returns `null`, and there is no user-visible error and no
transcript — which then triggers E3's silent refusal.

### E8 — The submit-button defect is real but currently inert (**high**)

The shared `Button` (`components/ui/button.tsx:31-38`) never defaults
`type="button"`, and `research-transcript-panel.tsx:23` and
`research-run-details.tsx:36` omit it, so per the HTML spec they are
`type="submit"`.

They are **not inside a form today** — the message list is a sibling of the
composer's `<form>`, not a descendant. So this is a latent defect, not the cause
of any observed symptom. Worth fixing at the `Button` primitive, where it
protects every future caller.

### E9 — Dead code (**high**)

`runEnricherTranscript` (`chat-messages.service.ts:377-417`) has no production
callers.

---

## What has been fixed so far

| Finding        | Landed     | Effect measured on the same page                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B2, B3, B4, B7 | 2026-09-10 | Thread re-downloads while waiting: **30/min → 12/min**, at a single clean 5 s cadence with no duplicate pairs. The 10-minute re-arming loop can no longer recur.                                                                                                                                                                                                                                                   |
| A1, A2         | 2026-09-10 | Idle requests: **83/min → 2/min** (−98%), the survivor being the deliberate 30 s health poll. `/files` 4.2 MB serialisations: **6/min → 0**.                                                                                                                                                                                                                                                                       |
| C1-C3, C5-C8   | 2026-09-10 | Telemetry stopped being a request per log line. A send-and-answer's `/client-logs` calls: **12 → 1**. Verified live: one `POST /client-logs/batch` carrying 4 collapsed events, 201, and 3 server log lines where ~16 would have been written. C4 is only PARTLY closed — see below.                                                                                                                               |
| E4, E8, E9     | 2026-09-10 | "Used N sources" became "Read N pages", derived from each item's own `source` field, with links found as a separate number and the search/fetch counts read from `toolsUsed` instead of hardcoded zeros. `Button` now defaults to `type="button"` (no form in the app relied on the implicit submit). 106 lines of dead enricher wrapper deleted.                                                                  |
| E0, E1, E3, E6 | 2026-09-10 | A pasted URL is opened instead of searched for. Verified live: `summarize https://example.com/ for me` traced `fetch.direct` BEFORE `search`, recorded `web_fetch:user_url`, and ranked the pasted page first at confidence 1 — where the same prompt previously returned an Adobe product page, a Facebook post and a Medium tutorial and never opened the link. `SEARCH_ONLY` warns by name instead of fetching. |
| D1, D2         | 2026-09-10 | A fresh send no longer asks for replay, so it cannot be handed the previous run's `DONE`. A clean close now reconnects unless a terminal event was actually seen. Verified with a real send: **exactly one** stream connection, `replay=false`, held open 6.25 s for the whole generation, answer rendered. D5 withdrawn — the audit was wrong about it.                                                           |

**Targets T1, T3, T6 and T7 are met**; T4 is met for the idle case. Section E is
open, plus D3 (a dead stream is still silent to the user) and D4 (no
`Last-Event-ID`, so recovery still replays rather than resumes).

**C4 is partly closed, and the remainder is named rather than quietly counted
as done.** Dedup landed (identical events inside a flush window collapse to one
event with an `occurrences` count) and so did the unload flush (`pagehide` +
`sendBeacon`, so a pending buffer is no longer dropped on navigation). What did
NOT land: there is no sampling, and there is no retry — `flushLogs` still ends
in `.catch(() => {})`, so a failed batch is lost. Both are deferred
deliberately in [ADR-089](../13-adr/adr-089-client-telemetry-batch-endpoint.md)
under "Revisit when".

E is mostly closed. The capability to read a pasted URL exists (E0/E1), the
model is told the truth about what ran (E3/E6), and the panel reports what was
read rather than what was found (E4). What remains is **provider honesty and
one silent failure**: the provider dropdown is still decorative on compare and
the nine orchestration modes (E5), path B still tells the model nothing about
research having run (E2), and a prompt over 500 characters still 400s the
search and disables research with no user-visible error (E7).

A measurement caveat worth keeping: an idle reading of _zero_ is as likely to
mean the page failed to hydrate as it is to mean success. The first attempt at
this measurement returned 0 requests because a stale chunk 404'd and left the
app on "Authenticating…". Always confirm the page actually rendered before
believing a low number.

## Sequencing

The dependencies that decide the order, derived from the findings above:

0. **D1 before everything in D.** The stale-`DONE` race is the engine behind the
   aborts, the phantom CORS errors and much of the REST traffic. Heartbeats,
   event IDs and resume are all worth doing, and none of them fixes this.
   Ordering the buffer reset before the stream opens is the fix, and it is small.
1. **B7 before A1.** The messages list is kept fresh by timers today because its
   real invalidation is aimed at a dead key. Remove the polling first and the UI
   silently stops updating. Fix the key, then the timers.
2. **B5 before B2/B4.** Merging streamed tokens into the cache is what makes the
   full-thread refetch on `DONE` unnecessary. Without it, removing the refetch
   loses the answer.
3. **C2 before C1.** The batch endpoint has to exist before the client can batch.
4. **A2 is independent** and is the cheapest large win: an opt-out on one query,
   plus a projection or a cheaper freshness check on the files endpoint.
5. **B3 is a two-line fix** (forward the abort signal in `apiClient.get`) and can
   land at any time; it removes the duplicate request directly.

## See also

- [`chat-pipeline-baseline-2026-09.md`](chat-pipeline-baseline-2026-09.md) — the measurements
- [`technical-debt-register.md`](technical-debt-register.md)
- [`risk-register.md`](risk-register.md)
