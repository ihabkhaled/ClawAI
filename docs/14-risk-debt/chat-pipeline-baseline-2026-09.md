# Chat pipeline — measured network baseline, 2026-09-10

> The numbers the chat reliability/performance programme is measured against.
> Findings and root causes live in
> [`chat-pipeline-audit-2026-09.md`](chat-pipeline-audit-2026-09.md). This
> document is only evidence: what the running app actually does, measured, so
> that "we improved it" is a comparison rather than a claim.

## How this was measured

Reproduce it exactly, or the comparison is worthless.

- **Build**: local dev stack, `./scripts/claw.sh up -d`, frontend at
  `https://claw.local`, signed in as the seeded admin.
- **Page**: `/en/chat/{threadId}` at 1366×768 in Chrome, left completely
  untouched for the measurement window. No typing, no scrolling, no focus
  changes.
- **Instrument**: the browser's own Resource Timing buffer, not a proxy and not
  a monkey-patched `fetch`, so `EventSource` and service-worker replays are
  counted too:

  ```js
  performance.setResourceTimingBufferSize(3000);
  const t0 = performance.now();
  // …wait…
  performance
    .getEntriesByType('resource')
    .filter((e) => e.startTime >= t0 && e.name.includes('/api/v1/'));
  ```

- **Sizes** are `decodedBodySize` (what the browser parses), reported separately
  from `transferSize` (what crossed the wire). Confusing the two is how a
  4 MB problem gets dismissed as a 0 KB one — see the `/files` row below.
- **Server-side confirmation** from `docker logs claw-nginx` and
  `docker logs claw-file-service`, because a request that returns `304` still
  costs the backend everything except the wire.

## When to stop trusting these numbers

They describe the build of 2026-09-10 on one machine. They are a **reference
point, not a fact about the product**: re-measure with
[`skills/measure-chat-network-baseline.md`](../../skills/measure-chat-network-baseline.md)
rather than quoting these figures once any remediation has landed. Check TD-030
in [`technical-debt.md`](technical-debt.md) for what has already changed.

## Result 1 — idle page, thread whose last turn completed

37 seconds, no interaction.

| Endpoint                       | Requests |    Cadence | Decoded per response |
| ------------------------------ | -------: | ---------: | -------------------: |
| `/client-logs`                 |       12 |      burst |                 tiny |
| `/research/search-providers`   |        6 |       ~6 s |              ~0.5 KB |
| `/files`                       |        4 | **10.0 s** |         **4,203 KB** |
| `/connectors/available-models` |        4 | **10.0 s** |            **91 KB** |
| `/chat-threads`                |        4 |     10.0 s |             ~19.5 KB |
| `/auth/me`                     |        4 |     10.0 s |              ~1.2 KB |
| `/auth/me/entitlements`        |        4 |     10.0 s |                ~2 KB |
| `/chat-threads/{id}`           |        4 |     10.0 s |              ~0.5 KB |
| `/chat-threads/{id}/share`     |        4 |     10.0 s |                ~0 KB |
| `/credit/me`                   |        4 |     10.0 s |              ~0.3 KB |
| `/health`                      |        1 |       once |                 2 KB |
| **Total**                      |   **51** |            |                      |

**≈ 83 API requests per minute on a page nobody is touching.**

Eight endpoints share a dead-regular **10.0 second** cadence — measured gaps
10.2, 10.0, 10.0, 10.1, 10.1 — which is a configured interval, not a
coincidence of remounts.

Zero `/chat-messages/thread/{id}` requests. That matters: the thread poll is
**not** always-on, and any claim that it is would be wrong. See Result 2.

## Result 2 — idle page, thread whose last turn never completed

77 seconds, no interaction, on a thread left mid-generation on 2026-08-31.

| Endpoint                     | Requests |    Cadence | Decoded per response |
| ---------------------------- | -------: | ---------: | -------------------: |
| `/client-logs`               |       71 |      burst |                 tiny |
| `/chat-messages/thread/{id}` |       39 | **2.00 s** |          **28.5 KB** |
| `/research/search-providers` |       14 |       ~5 s |              ~0.5 KB |
| seven endpoints as above     |   8 each |     10.0 s |             as above |
| **Total**                    |  **190** |            |                      |

**≈ 148 API requests per minute.**

The thread poll runs at a dead-regular **2000 ms** — measured gaps 2003, 1998,
2003, 1999, 1998, 2000, 2004, 1997 — and re-downloads the **entire** thread each
time. This is the reported "91 KB → 212 KB and growing" curve: the poll does not
care how large the conversation is, and it does not stop when nothing is
happening, because the condition it watches is "a response is in flight" and an
abandoned generation never clears it.

At the observed 28.5 KB this is **855 KB/minute** of conversation re-download.
On the 212 KB thread from the original QA report it is **6.4 MB/minute**.

## The `/files` finding, stated precisely

This is the largest single number in the baseline and the easiest to misreport.

| Measure                 | Value                                                |
| ----------------------- | ---------------------------------------------------- |
| Cadence                 | every 10.0 s, per open tab                           |
| Body the service builds | **4,203 KB** (`etag: W/"41ad1d…"` = 4,313,373 bytes) |
| Body on the wire        | **0 bytes** — `HTTP/2.0 304` at nginx                |
| Service response time   | ~20 ms, every time                                   |

So: **bandwidth is not the problem here; the server and the client both do the
full work anyway.** Express computes its ETag _after_ the handler has run, so
`claw-file-service` queries, serialises and hashes 4.3 MB every ten seconds per
open tab, and only then discovers it can answer 304. The browser, for its part,
re-parses that 4.3 MB from cache and hands it to the query cache.

Reporting this as "24 MB/minute of traffic" would be false. Reporting it as
"harmless, it's a 304" would also be false. It is roughly **25 MB/minute of
JSON serialisation and parsing** that produces no new information.

## Streaming

One `/chat-messages/stream/{threadId}` connection was observed in the window,
not several — so stream _multiplication_ is not reproduced by simply sitting on
the page. Its Resource Timing entry completed after 610 ms rather than staying
open for the life of the page, which is consistent with the reported
"connection repeatedly disappears". Reproducing the abort and CORS symptoms
needs an actual generation in flight and is **not covered by this baseline** —
that gap is named rather than papered over.

## Client telemetry

92 `POST /client-logs` requests were recorded across the two windows, **one HTTP
request per log line**. The buffer in the client logger delays for 5 seconds and
then issues one request per buffered entry in a loop, which is what turns a
mount into a burst.

## Targets

These are the numbers a later batch has to beat, on the same page, same build
procedure, same instrument.

| #   | Target                                                 |   Baseline |             Goal |
| --- | ------------------------------------------------------ | ---------: | ---------------: |
| T1  | Idle requests/min, completed thread                    |         83 |  **≤ 16** (−80%) |
| T2  | Idle requests/min, thread with a stale in-flight flag  |        148 |         **≤ 20** |
| T3  | `/files` server-side serialisations per idle minute    |          6 |            **0** |
| T4  | Full-thread re-downloads per idle minute               |         30 |            **0** |
| T5  | Full-thread re-downloads per completed streamed answer |        ≥ 1 |            **0** |
| T6  | HTTP requests per 20 client log events                 |         20 |            **1** |
| T7  | Concurrent SSE connections per active thread           | 1 observed | **1**, held open |
| T8  | Duplicate simultaneous fetches of the same resource    |    present |            **0** |

## What this baseline does not cover

Named so nobody mistakes silence for a pass:

- Behaviour during an actual generation: TTFT, stream abort, CORS failures,
  duplicate thread fetches triggered by send. Needs a working provider; the
  local Ollama account is over its session limit, which is why the sample thread
  ends in a refusal.
- A 50-message conversation. The threads measured hold 13 messages; the
  original QA report's 212 KB payloads come from a larger one.
- React render counts and DOM node counts.
- Multi-tab behaviour, which multiplies every per-tab number above.

## See also

- [`chat-pipeline-audit-2026-09.md`](chat-pipeline-audit-2026-09.md) — the root causes behind these numbers
- [`technical-debt-register.md`](technical-debt-register.md)
