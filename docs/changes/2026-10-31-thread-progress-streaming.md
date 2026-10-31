# Change - Thread progress is pushed, and the page follows it smoothly

Date: 2026-10-31. Decision: [ADR-201](../13-adr/adr-201-thread-progress-is-pushed-over-sse-with-polling-fallback.md).

## Why

The owner's progress page polled every 3 s, so a new step could show up to 3 s late, and it scrolled once per poll, in jumps.
Owner request: smoother, faster, much more reliable.

## What changed

- threads-service: new SSE route `GET /api/v1/thread-publications/:publicationId/generation-progress/stream` (owner only, 404 otherwise). A shared watcher per running job reads the generation service every 400 ms (1 s when idle) and pushes a full snapshot only when it changed. Heartbeat 15 s, terminal event then close, 10-minute lifetime, `Last-Event-ID` resume, 3 streams per publication and 6 per user per replica, backpressure keeps the newest snapshot.
- nginx (`infra/nginx/locations.conf`, `infra/nginx/nginx.distributed.conf.template`): unbuffered regex location with a 24 h read timeout. Restart nginx (single-file bind mount), do not reload.
- frontend: `useThreadProgressStream` writes snapshots into the existing react-query entry; polling is the silent fallback and runs whenever the stream is not live. `connectSse` gained opt-in `maxAttempts`, `jitterRatio`, `resetAttemptsAfterLive` (chat unchanged). `useThreadFollowBottom` now follows continuously (ResizeObserver plus an eased `requestAnimationFrame` loop).
- No new env var, event, table or i18n key.

## Rollback

Abort or block the stream route (the page then polls every 3 s as before), or revert the frontend hook; the GET endpoint never changed.

## Not done

A per-step event from the generation service (the watcher still reads on a short timer); a cross-replica stream cap.
