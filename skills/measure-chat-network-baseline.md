# Skill: Measure the Chat Page Network Baseline

> Use this before and after any change that claims to reduce chat traffic,
> polling, payload size or telemetry volume. It produces the numbers that turn
> "we improved it" into a comparison.
>
> The baseline it was written from is
> [`docs/14-risk-debt/chat-pipeline-baseline-2026-09.md`](../docs/14-risk-debt/chat-pipeline-baseline-2026-09.md);
> the targets to beat are that document's T1–T8 table.

---

## When to use

- Before starting any batch of the chat reliability/performance programme
  (TD-030), to confirm the starting numbers still hold.
- After it, on the same page, to produce the comparison.
- Any time someone claims an endpoint is "cached" or "not really polling".

**Do not** substitute the DevTools Network tab by eye, or a request count
without payload sizes. The two failures this catches — a 304 that still costs a
full server serialisation, and a 2-second poll that only arms on some threads —
are both invisible to a glance.

## Before you start

The stack must be real: `./scripts/claw.sh up -d`, `https://claw.local`, signed
in. After any frontend edit, `docker restart claw-frontend` **and** unregister
the service worker — see
[`verify-responsive-layout-in-browser.md`](verify-responsive-layout-in-browser.md),
which explains why a restart alone leaves you measuring the old build.

Pick **two** threads, because they behave differently and only measuring one
will mislead you:

1. one whose last turn **completed** (last message is an assistant message);
2. one whose last turn **never completed** (last message is a user message).

The second arms a 2-second full-thread poll for ten minutes on every page load.
Reporting only the first understates idle traffic; reporting only the second
overstates it.

## The recorder

Resource Timing, not a patched `fetch` — it also catches `EventSource` and
service-worker replays.

```js
performance.setResourceTimingBufferSize(3000);
window.__t0 = performance.now();
window.__t0wall = Date.now();
window.__read = () => {
  const rows = performance
    .getEntriesByType('resource')
    .filter((e) => e.startTime >= window.__t0 && e.name.includes('/api/v1/'));
  const by = {};
  for (const e of rows) {
    const p = new URL(e.name).pathname.replace(/\/[0-9a-z]{20,}/gi, '/{id}').replace('/api/v1', '');
    const b = by[p] || (by[p] = { count: 0, decodedKB: 0, transferKB: 0 });
    b.count += 1;
    b.decodedKB += (e.decodedBodySize || 0) / 1024;
    b.transferKB += (e.transferSize || 0) / 1024;
  }
  return {
    seconds: Math.round((Date.now() - window.__t0wall) / 1000),
    total: rows.length,
    byEndpoint: Object.entries(by)
      .map(([path, v]) => ({
        path,
        count: v.count,
        decodedKB: Math.round(v.decodedKB),
        transferKB: Math.round(v.transferKB),
      }))
      .sort((a, b) => b.count - a.count),
  };
};
```

Then leave the page **completely alone** for at least 60 seconds. No typing, no
scrolling, no tab switches — `refetchOnWindowFocus` is on by default, so a focus
change silently adds a round and ruins the sample.

## Report both sizes, always

`transferSize` is what crossed the wire. `decodedBodySize` is what the browser
parsed. Confusing them is how a 4 MB problem gets dismissed.

The `/files` case is the worked example: `transferSize` 0, `decodedBodySize`
4,203 KB, `HTTP/2.0 304` at nginx — and the service still queried, serialised
and hashed the full 4.3 MB body before Express could decide to answer 304,
because Express computes its ETag _after_ the handler runs.

So confirm the server side too, don't infer it:

```bash
docker logs claw-nginx --since 2m | grep "GET /api/v1/<endpoint>" | tail -5
docker logs claw-<service> --since 60s | tail -20   # look for responseTime + etag
```

A `304` in the nginx log means the wire was saved. It does **not** mean the
work was.

## Name the cadence, don't estimate it

A cadence is evidence; "roughly every few seconds" is not. Print the gaps:

```js
const rows = performance
  .getEntriesByType('resource')
  .filter((e) => e.name.includes('/api/v1/<endpoint>'));
rows.slice(1).map((e, i) => Math.round(e.startTime - rows[i].startTime));
```

Gaps of `2003, 1998, 2003, 1999` are a configured 2000 ms timer. Gaps that
scatter are remount-driven. They have different causes and different fixes.

## What to record

| Field                                                    | Why                                    |
| -------------------------------------------------------- | -------------------------------------- |
| Window length in seconds                                 | Every count is meaningless without it  |
| Total requests, and requests/minute                      | The headline                           |
| Per endpoint: count, cadence, decoded KB, transfer KB    | Where it comes from                    |
| Server-side confirmation for anything returning 304      | Wire saved ≠ work saved                |
| Concurrent SSE connections, and whether they stayed open | Duration, not just count               |
| Which of the two thread states was measured              | Otherwise the number is unreproducible |

## Definition of done

- [ ] Both thread states measured, each for ≥ 60 s of genuine idle.
- [ ] Per-endpoint counts **and** decoded sizes recorded, not just counts.
- [ ] Every cadence claim backed by printed gaps.
- [ ] Anything returning 304 checked against the service log before being called
      cheap.
- [ ] The service worker was unregistered and the build under test confirmed.
- [ ] Numbers compared against the T1–T8 targets, with regressions named.

## See also

- [`docs/14-risk-debt/chat-pipeline-baseline-2026-09.md`](../docs/14-risk-debt/chat-pipeline-baseline-2026-09.md) — the reference numbers and targets
- [`docs/14-risk-debt/chat-pipeline-audit-2026-09.md`](../docs/14-risk-debt/chat-pipeline-audit-2026-09.md) — the causes behind them
- [`verify-responsive-layout-in-browser.md`](verify-responsive-layout-in-browser.md) — the sibling procedure for layout
