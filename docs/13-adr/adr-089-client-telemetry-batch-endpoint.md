# ADR-089: Client telemetry ships as batches to a second endpoint

- **Status**: Accepted
- **Date**: 2026-09-10
- **Deciders**: Platform / Frontend
- **Supersedes**: nothing
- **Related**: [ADR-088](adr-088-composer-auto-height-replaces-drag-resize.md) ·
  [rules/19-logging-observability-and-redaction.md](../../rules/19-logging-observability-and-redaction.md) ·
  [docs/14-risk-debt/chat-pipeline-audit-2026-09.md](../14-risk-debt/chat-pipeline-audit-2026-09.md) section C

## Context

The frontend logger buffered entries for five seconds and then issued **one
HTTP request per buffered entry** in a loop. The buffer was never a batch. It
was a delay that guaranteed the requests left together, so a page mount became
a burst of twenty-odd calls inside the same millisecond.

Measured: a single send-and-answer on the chat page cost 20 requests, **12 of
them `/client-logs`**
([audit](../14-risk-debt/chat-pipeline-audit-2026-09.md), section C). Across the
two idle measurement windows, 92 telemetry requests were recorded — one per log
line ([baseline](../14-risk-debt/chat-pipeline-baseline-2026-09.md)). After the
polling work in the previous batches, this was the largest remaining source of
requests in the application.

Three separate costs, not one:

1. **Requests.** Each line spent a rate-limit unit against a 2500/60 s bucket,
   so a burst could be throttled into silent loss.
2. **Writes.** Each line was one Mongo `save()`.
3. **Amplification.** Each ingest produced roughly four server log lines
   (interceptor, service debug, service log, repository log). Telemetry
   ingestion generated four times as much telemetry.

Two further problems shared the same seam. There was no severity gate at all —
`LogLevel` is an unordered string enum, so no comparison was even possible, and
all 46 `logger.debug` sites shipped to production from inside `queryFn`s.
And log POSTs went through the auth-refresh interceptor, so a 401 on a
telemetry write could clear auth storage and redirect the user to `/login`.

## Options considered

**1. Keep one request per line, raise the rate limit.**
Rejected. It treats the symptom that is cheapest to observe and leaves the
writes, the amplification and the burst shape untouched. The limit exists for a
reason; raising it to accommodate a design flaw removes the signal that the
flaw is there.

**2. Accept a bare array as the request body.**
Rejected. `POST /client-logs` with `[...]` would be a breaking change to a live
route, and a bare array leaves nowhere to put the things a batch will
eventually want to carry — a clock-skew hint, a session id, a dropped-event
count. Every one of those would be another breaking change.

**3. A second route taking `{ events: [...] }`, single-event route retained.**
**Chosen.**

**4. Drop the debug calls at each of the 46 call sites.**
Rejected as the mechanism, though the volume problem is real. Deleting them
loses them locally too, where they are genuinely useful, and it is not
enforceable — the 47th one gets added next week. A transport-level gate keeps
every level in the in-memory store for the developer log view while stopping
DEBUG at the network boundary in production only.

## Decision

- `POST /client-logs/batch` accepts `{ events: [...] }`, at most
  `CLIENT_LOG_BATCH_MAX_EVENTS` (100), and writes them with
  `insertMany(..., { ordered: false })`.
- `POST /client-logs` stays, unchanged, for compatibility. Nothing new uses it.
- The client collapses identical events within a flush window into one event
  carrying an `occurrences` count. Identity is level + component + action +
  message; metadata is excluded, so two events differing only by a timestamp
  are one event.
- `CLIENT_LOG_MIN_TRANSPORT_LEVEL` gates the network only: `INFO` in
  production, `DEBUG` elsewhere. The in-memory store is unaffected.
- A `pagehide` handler re-sends the buffer through `navigator.sendBeacon`, so a
  flush pending at navigation is no longer dropped in silence.
- `CLIENT_LOG_MAX_BUFFER_EVENTS` (500) bounds the buffer, dropping oldest.
- `AUTH_REFRESH_EXEMPT_PATHS` removes telemetry from the token-refresh flow.

## Consequences

**Good.** One request replaces up to a hundred, with proportional falls in
rate-limit spend, Mongo writes and server log lines. Unload no longer loses
buffered events. A telemetry write can no longer end a session.

**Bad, and accepted.**

- **Two ingest routes to maintain.** The single-event one is dead weight kept
  for compatibility. It is documented as such in the service's `CLAUDE.md` so
  it does not attract new callers.
- **Two ceilings that must agree.** The client's
  `CLIENT_LOG_MAX_BATCH_EVENTS` must stay at or below the server's
  `CLIENT_LOG_BATCH_MAX_EVENTS`, or a large flush is rejected whole. They are
  separate constants in separate workspaces; a test in each names the other.
- **Validation is all-or-nothing; the write is not.** These are two different
  layers and it is worth being exact, because the obvious reading is wrong. Zod
  validates the whole envelope in a `ZodValidationPipe` before anything reaches
  Mongo, so **one malformed event rejects the entire batch with a 400** — a
  client that sends a bad event loses the good ones with it. `ordered: false`
  covers only the narrower case of documents that pass validation and then fail
  at the driver, and the service rethrows on that path, so in practice no
  client observes `accepted` below the number submitted today. The field is
  reported honestly rather than assumed equal to the request size, which is
  what makes a future partial-acceptance mode a change of behaviour rather than
  a change of contract.
- **Collapsing loses per-occurrence timestamps.** Twenty identical events
  become one plus a count, so the spacing between them is gone. For a render
  loop or a retrying query that spacing carries nothing; for anything where it
  would matter, the event should carry distinguishing metadata, which defeats
  the collapse by design.
- **DEBUG no longer reaches production dashboards.** Intended. If a specific
  debug line is needed in production, it should be `logger.info`, which is a
  decision made once at the call site rather than a default applied to all 46.

## Revisit when

- Telemetry volume rises enough that sampling is needed. Nothing samples
  today; volume growth is this decision's own trigger and has not been
  observed, so sampling stays deferred.
- Losing a whole batch to one malformed event proves costly enough to justify
  per-event validation with partial acceptance, instead of the envelope-level
  rejection above.
- A second client (mobile, extension) needs the same ingest contract.
- The single-event route reaches zero callers and can be removed.

**Retry landed 2026-09-11.** "A failed flush is dropped rather than retried"
is no longer true: `postBatchWithRetry`
(`apps/claw-frontend/src/utilities/logger.utility.ts`) retries a failed
`/client-logs/batch` send up to `CLIENT_LOG_MAX_RETRY_ATTEMPTS` (3) times with
doubling backoff (`CLIENT_LOG_RETRY_BASE_MS`, 2s/4s/8s) before giving up. This
was split out from sampling deliberately: losing a batch to a transient
network blip is a correctness gap regardless of volume, while sampling only
earns its complexity once volume is actually a problem — the two "revisit
when" conditions were independent and only one had already been met. The
beacon-flush path (page unload) is unchanged: there is no response to retry on
by the time it would fail.
