# Service Guide: claw-live-service

## Overview

| Property   | Value                                                                    |
| ---------- | ------------------------------------------------------------------------ |
| Port       | 4022                                                                     |
| Database   | PostgreSQL (`claw_live`), plus Redis for presence and SSE fan-out        |
| Public API | `/api/v1/live` (sources, sessions, SSE stream, history, usage, admin)    |
| Secrets    | none of its own (`INTER_SERVICE_AUTH_TOKEN` and `JWT_SECRET` are shared) |
| Runtime    | needs `ffmpeg` and `ffprobe` in the container image                      |

Live Intelligence analyses a live stream once and shares the result: viewers of the same source and mode attach to one
processing run, one transcript and one summary stream. The decision is
[ADR-221](../13-adr/adr-221-live-intelligence-shared-live-stream-analysis.md), the product rules are in
[live-intelligence-spec](../02-business-product/live-intelligence-spec.md) and the contract that code follows is
[live-intelligence-architecture](../03-architecture/live-intelligence-architecture.md).

## Status

Built and verified on the dev stack 2026-11-22 (API smoke 28/28, billing journey 9/9, 100 concurrent viewers on one run,
browser pause/resume/captions on desktop and mobile). Not deployed to production. The 3 s caption target is not met by
design (about 7-12 s).

## Modules (`src/modules`)

| Module        | Owns                                                                                                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sources       | URL resolve (YouTube, HLS, fixture), SSRF guard with pinned DNS, HLS fetcher, same-origin HLS proxy, fixture broadcaster                                                                  |
| processing    | one run per processing key; DB lease with generation fence (`run-coordinator`, `fenced-run-writer`); reconciler (claims expired leases); worker; summary, translation and vision managers |
| realtime      | SSE stream, Redis event bus and replay buffer (`Last-Event-ID`)                                                                                                                           |
| sessions      | viewer sessions, presence, heartbeat, coverage, reaper, `sendBeacon` close, usage                                                                                                         |
| billing       | free seconds, 60 s blocks, fixed-price PAYG through auth-service, grace                                                                                                                   |
| history       | paginated history, feed within coverage, versions, export (PDF, Markdown, TXT)                                                                                                            |
| enhance       | user-picked model rewrite of one card, estimate first                                                                                                                                     |
| deletion      | history deletion, `user.deleted` consumer, orphan-run sweeper                                                                                                                             |
| admin, policy | overview, stop a run, versioned policy (`LivePolicyVersion`), rollback                                                                                                                    |

## API (`/api/v1/live`, user auth unless noted)

| Method and path                                                         | Purpose                                                               |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `POST /sources/resolve`                                                 | `{ url }` to `{ sourceKind, capability, embedUrl, reasonCode }`       |
| `GET /streams/:streamId/hls/p`, `GET /streams/:streamId/hls/:file`      | HLS proxy, host-pinned to the stream                                  |
| `POST /sessions`                                                        | start or attach: `{ url, language, mode, attestRights }`              |
| `POST /sessions/:id/heartbeat`                                          | playback state and position                                           |
| `POST /sessions/:id/approve-credits`                                    | `{ spendingCapMicroUsd? }`                                            |
| `PATCH /sessions/:id`, `DELETE /sessions/:id`                           | change language or mode, explicit close                               |
| `POST /sessions/:id/close`                                              | `sendBeacon` close with the close token (`@Public()`)                 |
| `GET /sessions/:id/stream`                                              | SSE: captions, cards, highlights, status                              |
| `GET /usage`                                                            | free seconds, price, grace, policy version                            |
| `GET /history`, `GET /history/:id/events`                               | cursor-paginated sessions and the feed within coverage                |
| `GET /events/:id/versions`, `POST /events/:id/enhance`                  | card versions, enhance (`confirm=false` estimate, `confirm=true` run) |
| `POST /history/:id/export`                                              | `{ format: PDF, MARKDOWN or TXT }`, attachment                        |
| `DELETE /history`, `DELETE /history/:id`                                | delete history; financial rows stay                                   |
| `GET /admin/overview`, `POST /admin/runs/:runId/stop`                   | staff: live runs, lag, money; stop one run                            |
| `GET /admin/policy`, `PUT /admin/policy`, `POST /admin/policy/rollback` | versioned policy                                                      |

Full request and response shapes: [architecture section 9](../03-architecture/live-intelligence-architecture.md).

## Constraints that bite

- Writes are fenced: a worker commits only while its generation matches the run. A deleted or stale run writes nothing.
- ffmpeg reads local files only (`-protocol_whitelist file`); the worker fetches playlists and segments itself through the
  SSRF guard and the DNS-pinned connection.
- YouTube is `PLAYER_ONLY`. `/watch`, `youtu.be` and `/channel/UC...` links play (channel links through the `live_stream`
  embed); `@handle` links are refused with `LIVE_YOUTUBE_HANDLE_UNSUPPORTED`.
- Paid blocks are priced by the policy and sent to auth-service as `fixedCostMicroUsd` (auth `FIXED_PRICE_SURFACES`).
- PDF export calls file-generation `POST /api/v1/internal/file-generations/render-pdf` (stateless, nothing stored).
- The staff plan slug `admin` must have a row in the policy `plans` map, or staff fall to `defaultPlan` (0 free seconds).
- The orphan-run sweeper runs every 300 s under a Redis lock and tombstones finished runs nothing references.
- The dev frontend needs `docker restart claw-frontend` to see new routes.
- Rollback: set the policy `killSwitch`, or stop the live-service container. The database changes are additive.

## Boundaries

- The `claw_live` database belongs to this service alone. Other services call its API; none reads it.
- It calls file-service (speech to text), connector-service (model chain), auth-service (plan, PAYG meter) and
  chat-service over HTTPS with the inter-service token. It publishes and consumes events only through
  `@claw/shared-rabbitmq`.
- `/api/v1/internal/*` is never routed by nginx (404 at the edge).

## Infrastructure

- Compose: `live-service` in `docker/docker-compose.{dev,prod}.services.yml`, `pg-live` in
  `docker/docker-compose.{dev,prod}.databases.yml` (container `claw-pg-live`, host port 5460, volume `pg-live-data`).
  The prod block sets `SEED_ON_START=true` so the entrypoint seeds policy version 1.
- Images: both Dockerfiles install ffmpeg (Debian package) and build every `@claw/shared-*` package the service declares.
- Environment: `LIVE_SERVICE_PORT`, `LIVE_SERVICE_URL`, `LIVE_DATABASE_URL`, `PG_LIVE_*`, `LIVE_ALLOW_HTTP_SOURCES`,
  `LIVE_WORKER_MAX_CONCURRENCY`, and the shared `REDIS_URL`, `RABBITMQ_URL`, `AUTH_SERVICE_URL`, `CHAT_SERVICE_URL`,
  `CONNECTOR_SERVICE_URL`, `FILE_SERVICE_URL`, `FILE_GENERATION_SERVICE_URL`
  (see [environment-variables](../06-data/environment-variables.md)).
- Gateway: `location /api/v1/live` plus two regex locations in `infra/nginx/locations.conf` and the distributed template
  (`CLAW_LIVE_ORIGIN`): the session SSE stream (`/api/v1/live/sessions/:id/stream`) and the HLS proxy
  (`/api/v1/live/streams/:id/hls/*`), both with `proxy_buffering off`, placed before the prefix.
- TLS: `live-service` is in the `HOSTS` list of `install-tls.sh` and `install-tls.ps1`; re-run `install-tls` so the
  certificate lists it.
- Health: registered in `claw-health-service` (`SERVICE_URLS`, platform status group).

## Default policy (seed v1, owner decision 2026-11-22)

`prisma/seeders/live-policy.seeder.cjs` inserts `LivePolicyVersion` version 1 with `activeKey = 'active'` only when the
table is empty, so an administrator's later versions are never overwritten.

| Plan                               | Free seconds per month | Paid price (micro-USD per minute) |
| ---------------------------------- | ---------------------- | --------------------------------- |
| free                               | 1800                   | 20000                             |
| starter                            | 7200                   | 20000                             |
| plus                               | 18000                  | 20000                             |
| pro, team, scale, unlimited, admin | 36000                  | 20000                             |
| any other plan (`defaultPlan`)     | 0                      | 20000                             |

Other values: `killSwitch` false, `featureEnabled` true, `visionBilling` `ACTUAL_COST`, `graceSeconds` 60,
`maxActiveStreams` 20, `maxSessionsPerUser` 3, `sessionsPerUserPerHour` 30, `dailyBudgetMicroUsd` 20000000,
`budgetSoftStopPercent` 80, empty summary and vision model chains (set by the admin before launch).

## Upgrading an existing install

An existing `.env` is never rewritten. Add `PG_LIVE_PASSWORD`, `LIVE_DATABASE_URL`, `LIVE_SERVICE_URL`, and the other
`PG_LIVE_*` values (or run `bash scripts/ensure-prod-env.sh --env /srv/clawai/.env`), start the database once
(`docker compose ... up -d pg-live`), re-run `install-tls` so the certificate lists `live-service`, then deploy. See
[add-a-service-to-production](../11-runbooks/add-a-service-to-production.md).
