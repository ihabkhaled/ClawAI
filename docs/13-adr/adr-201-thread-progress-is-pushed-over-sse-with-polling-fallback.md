# ADR-201: Thread generation progress is pushed over SSE, with polling as the fallback

**Status:** Accepted

**Date:** 2026-10-31

Builds on [ADR-008](adr-008-sse-over-websocket.md) (SSE, not WebSocket) and the chat stream client (`utilities/sse.utility.ts`). Rules: [rule 07](../../rules/07-backend-controllers-and-transport.md), [rule 17](../../rules/17-rabbitmq-events-and-jobs.md), [rule 18](../../rules/18-error-handling-and-reliability.md), [rule 59](../../rules/59-chat-surfaces-are-one-pipeline.md).

## Context

The owner's Thread progress page polled `GET generation-progress` every 3 s (400 polls, pause after 5 consecutive errors) and scrolled once per poll. A new step showed up to 3 s late, the scroll moved in steps, and every open tab cost one request per 3 s through threads-service to the generation service's database.

## Decision

- **Endpoint.** `GET /api/v1/thread-publications/:publicationId/generation-progress/stream` (`text/event-stream`, owner only, a stranger or unknown id gets the same `404 Publication not found` before any byte is sent). The existing `GET generation-progress` stays: it is the first-paint source and the fallback.
- **Events** (all `data:` JSON with a `type`, like the chat stream): `progress` (a full snapshot, `id:` = a 16-hex content hash of the snapshot, the same on every replica), `terminal` (after the final snapshot, then the server closes), `heartbeat` every 15 s, `reconnect` (sent at the 10-minute lifetime, then the server closes), `gone` (the job was deleted), `error` (`UPSTREAM_UNAVAILABLE` after 5 failed reads, `TOO_MANY_STREAMS`).
- **Resume.** Every snapshot is complete, so a resume cannot have gaps. `Last-Event-ID` equal to the current snapshot's id sends nothing twice; any other value (or none) gets a fresh snapshot first. Ids are content hashes, so a reconnect to another replica works. The client also drops a snapshot that is older than the cache (later `updatedAt`, or the same time with fewer steps).
- **Source of changes: a shared server-side watcher, not events.** The generation service emits no event per step (only the completed and failed events), so threads-service keeps ONE watcher per (owner, publication, job) per replica that reads the generation service's progress every 400 ms while the job moves and every 1 s after 20 s without a change, emits only when the snapshot hash changed, never overlaps two reads, backs off 1, 2, 4, 8 s on errors and stops after 5. Any number of tabs share it, so the load on the generation service is at most about 2.5 reads/s per running job per replica, independent of open tabs (before: 0.33 reads/s per tab, but unbounded in tabs). It stops when the last stream closes or the job is terminal. The publication row is read once when a stream opens, never per tick. A per-step event from the generation service would replace the 400 ms read and is the planned next step.
- **Bounds (per replica).** 3 streams per publication, 6 per user (`429` at open, or a `TOO_MANY_STREAMS` event if the race is lost), 10-minute lifetime (a revoked session cannot outlive it; the client reconnects), heartbeats, cleanup of timers, counters and watcher on disconnect, backpressure: when the socket needs a drain only the newest snapshot is kept and offered again after 500 ms.
- **Gateway.** A regex location `~ ^/api/v1/thread-publications/[^/]+/generation-progress/stream$` in `infra/nginx/locations.conf` and `infra/nginx/nginx.distributed.conf.template` (the only two places the chat stream is configured): `proxy_buffering off`, `proxy_cache off`, `proxy_read_timeout 86400`, `Connection ""`, the restated client-address headers. nginx bind-mounts single files, so it must be RESTARTED, not reloaded.
- **Client.** `useThreadProgressStream` reuses `connectSse` (fetch streaming with the Authorization header, `Last-Event-ID`, a 45 s stall detector). `connectSse` gained three opt-in options (`maxAttempts`, `jitterRatio`, `resetAttemptsAfterLive`; chat keeps its defaults). Snapshots are written into the same react-query entry (`threadProgressQueryKey`), so no component changed. While the stream is `live` the 3 s poll is off; while it is connecting, reconnecting or failed the poll runs exactly as before (so it is never worse than today). Four reconnects with jittered back-off, then a silent fallback to polling and up to three later retries 30 s apart. A 403 or 404 is never retried. A tab hidden for 60 s closes its stream and opens a fresh one (a full snapshot) when shown again. The stream closes on a terminal status. Streamed snapshots do not spend the 400-poll budget.
- **Following.** `useThreadFollowBottom` no longer scrolls once per update: a `ResizeObserver` on the panel and `<main>` wakes a `requestAnimationFrame` loop that eases `scrollTop` toward the bottom (frame-rate independent, one read and one write per frame, idle when it arrives) and covers content growing inside a step. Every earlier rule is kept.

## Consequences

- No new env var, table, event or i18n key. One new route and three opt-in `connectSse` options.
- Per-replica caps mean N replicas allow N times the caps; each stream still costs no database work, only the shared watcher's upstream read.
- A user behind a proxy that buffers SSE sees no pushes; the stall detector and fallback turn that into the old 3 s poll.
- Not done: a per-step event from the generation service; a cross-replica stream cap; a sticky "streaming unavailable" memory across page loads.
