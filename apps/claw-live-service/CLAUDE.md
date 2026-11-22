# Live Service

Owns Live Intelligence: shared analysis of a live stream (captions, summaries, highlights, translations), the per-viewer
sessions and coverage, the hybrid usage billing and the versioned admin policy. Port 4022, database `claw_live`, route
`/api/v1/live`. It does not own chat, auth or payment data; it calls those services over HTTP and never crosses a
database boundary.

Contract: [live-intelligence-architecture](../../docs/03-architecture/live-intelligence-architecture.md) (when code and
this file disagree, fix one in the same change) - decision:
[ADR-221](../../docs/13-adr/adr-221-live-intelligence-shared-live-stream-analysis.md) - product:
[live-intelligence-spec](../../docs/02-business-product/live-intelligence-spec.md) - guide:
[service-guide-live](../../docs/04-backend/service-guide-live.md).

## What it owns (built, dev-stack verified 2026-11-22, not deployed)

- **Foundation.** `GET /api/v1/health` (public); Zod `AppConfig` (`LIVE_DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`, the AUTH,
  CHAT, CONNECTOR, FILE and FILE_GENERATION URLs, `INTER_SERVICE_AUTH_TOKEN`, `JWT_SECRET`, `LIVE_ALLOW_HTTP_SOURCES`,
  `LIVE_WORKER_MAX_CONCURRENCY`); global `AuthGuard`, `SessionRevocationGuard` (ADR-112), `RolesGuard`, `ThrottlerGuard`;
  `PrismaService` and the global ioredis client (`LIVE_REDIS_CLIENT`). Migration `20261122000000_live_init` and the
  idempotent seeder `prisma/seeders/live-policy.seeder.cjs` (policy version 1 only when the table is empty).
- **sources** - `POST /live/sources/resolve`, the HLS proxy (`GET /live/streams/:streamId/hls/p` and `/hls/:file`), the
  SSRF guard (`source-url-guard.service.ts`), the fetcher and the fixture broadcaster (a looped recording served as a
  local HLS window; real source, nothing mocked).
- **processing** - one run per processing key with a DB lease and generation fence (`run-coordinator`,
  `fenced-run-writer`), `run-reconciler` (recovers stale leases), `run-worker` (chunked STT through file-service),
  and the `transcript`, `summary`, `translation` and `vision` managers. Model calls go through connector-service.
  Caption latency is recorded on STT `LiveProviderCost` rows as speech end to commit (`latencyMs`).
- **realtime** - SSE `GET /live/sessions/:sessionId/stream` with `Last-Event-ID` replay over the Redis event bus.
- **sessions** - `POST/PATCH/DELETE /live/sessions`, heartbeat, approve-credits, presence, coverage, the reaper (detaches
  a session whose heartbeats stop) and the `sendBeacon` close (`POST /live/sessions/:id/close`, `@Public()`, signed close
  token); `GET /live/usage`.
- **billing** - 60 s blocks: free seconds first, then paid only after approval. Paid blocks are priced by the policy
  and sent to auth-service as `fixedCostMicroUsd` (auth `FIXED_PRICE_SURFACES`, zero tokens and units); one 60 s grace per
  exhaustion episode.
- **history** - `GET /live/history`, `/history/:id/events`, `/events/:id/versions`, `POST /history/:id/export` (PDF, Markdown,
  TXT). PDF is rendered by file-generation `POST /api/v1/internal/file-generations/render-pdf`.
- **enhance** - `POST /live/events/:eventId/enhance` (estimate first, then `confirm=true`, user-picked model, idempotent).
- **deletion** - `DELETE /live/history` and `/history/:sessionId`, the `user.deleted` consumer, and the orphan-run
  sweeper (every 300 s, Redis lock, 20 runs a pass: tombstones finished runs that no session or coverage references).
- **admin and policy** - `GET /live/admin/overview`, `POST /live/admin/runs/:runId/stop`, `GET/PUT /live/admin/policy`,
  `POST /live/admin/policy/rollback` (every change is a new immutable `LivePolicyVersion`).

## Constraints that bite

- **ffmpeg is a runtime dependency.** Both Dockerfiles install it and fail the build when `ffmpeg`/`ffprobe` are missing.
  Spawn it only through a bounded wrapper (timeout, output cap), never with a shell.
- **SSRF.** Only `https:` sources (plain `http:` only when `LIVE_ALLOW_HTTP_SOURCES=true`, dev and QA), public addresses
  only, DNS resolved once and the connection pinned to that address (`common/utilities/pinned-request.utility.ts`), no
  cross-host redirects (architecture section 1).
- **ffmpeg reads only local files.** The worker downloads segments itself, then runs ffmpeg on the local file with
  `-protocol_whitelist file`, so ffmpeg can never be steered to another host.
- **YouTube is `PLAYER_ONLY`**: never downloaded or analysed. `/watch`, `youtu.be` and `/channel/UC...` links play (the
  channel link through the `youtube-nocookie` `live_stream` embed). `@handle` and vanity links are refused with
  `LIVE_YOUTUBE_HANDLE_UNSUPPORTED`.
- **The staff plan slug `admin` must exist in the policy** (`plans.admin`, seed v1 gives 36000 s); a plan without a row
  falls to `defaultPlan` (0 free seconds).
- **Dev frontend needs a restart** (`docker restart claw-frontend`) to see new routes or edits to existing files.
- **Fenced writes.** Every worker commit runs in a transaction that first checks the run's `generation` and status; a stale
  worker or a deleted run writes nothing (architecture section 3).
- **Money rows are immutable.** `LiveUsageCharge` and `LiveProviderCost` carry unique idempotency keys; corrections are
  new compensating rows, and history deletion never deletes them.
- **Policy is data.** Limits, prices, free seconds and the kill switch live in `LivePolicyVersion`, not in env or code.
- **Stream speech is untrusted.** Delimited as data in prompts; model output is schema-validated plain text.
- Prisma client is generated to `src/generated/prisma` (git-ignored); `npm run build` and `npm test` generate it.
