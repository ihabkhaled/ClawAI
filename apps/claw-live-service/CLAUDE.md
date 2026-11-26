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
  `LIVE_WORKER_MAX_CONCURRENCY`, `LIVE_TWITCH_CLIENT_ID` (empty = Twitch server pull off)); global `AuthGuard`, `SessionRevocationGuard` (ADR-112), `RolesGuard`, `ThrottlerGuard`;
  `PrismaService` and the global ioredis client (`LIVE_REDIS_CLIENT`). Migrations `20261122000000_live_init` and `20261122120000_live_platforms_capture` (platforms, capture) and the
  idempotent seeder `prisma/seeders/live-policy.seeder.cjs` (policy version 1 only when the table is empty).
- **sources** - `POST /live/sources/resolve` (the platform registry: `constants/platform-registry.constants.ts` plus one
  parser per platform, 15 platforms plus 24 host-matched ones in `constants/video-platforms.constants.ts`, parsing
  only except the server-pull and recorded-video probes and the one Facebook share-link redirect `ShareLinkService` follows), the HLS proxy (`GET /live/streams/:streamId/hls/p` and `/hls/:file`), the
  SSRF guard (`source-url-guard.service.ts`), the fetcher and the fixture broadcaster (a looped recording served as a
  local HLS window; real source, nothing mocked).
- **processing** - `BROWSER_CAPTURE` runs read the viewer's tab audio from the Redis list `live:capture:<runId>`
  (`workers/capture-chunk-source.ts`), never the source; `SERVER_PULL` runs pull the resolved playlist (Twitch token or yt-dlp URL,
  re-resolved after a failed playlist fetch, at most once per 30 s); every other run pulls HLS. One run per processing key with a DB lease and generation fence (`run-coordinator`,
  `fenced-run-writer`), `run-reconciler` (recovers stale leases), `run-worker` (chunked STT through file-service),
  and the `transcript`, `summary`, `translation` and `vision` managers. Model calls go through connector-service.
  Caption latency is recorded on STT `LiveProviderCost` rows as speech end to commit (`latencyMs`).
- **realtime** - SSE `GET /live/sessions/:sessionId/stream` with `Last-Event-ID` replay over the Redis event bus.
- **sessions** - `POST/PATCH/DELETE /live/sessions`, the browser-capture audio route `POST /live/sessions/:id/audio`
  (`live-capture.controller/service/manager/repository`; raw `audio/wav` parser mounted in `main.ts` for that path only), heartbeat, approve-credits, presence, coverage, the reaper (detaches
  a session whose heartbeats stop) and the `sendBeacon` close (`POST /live/sessions/:id/close`, `@Public()`, signed close
  token); `GET /live/usage`.
- **billing** - 60 s blocks: free seconds first, then paid only after approval. Paid blocks are priced by the policy
  and sent to auth-service as `fixedCostMicroUsd` (auth `FIXED_PRICE_SURFACES`, zero tokens and units); one 60 s grace per
  exhaustion episode.
- **history** - `GET /live/history`, `/history/:id/events`, `/events/:id/versions`, `POST /history/:id/export` (PDF, Markdown,
  TXT). PDF is rendered by file-generation `POST /api/v1/internal/file-generations/render-pdf`. The download header is built with `contentDispositionHeader` from `@claw/shared-utilities` (rules/07 §8), never by hand.
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
- **Server-side reads: every platform except Discord (ADR-221 batches 3-4, owner decisions 2026-11-23).** A live
  stream is `SERVER_PULL`: `services/server-pull-resolver.service.ts` uses Twitch's web-player token (a `forbidden` token
  is honoured) or, for everything else, the pinned `yt-dlp` binary (argv only, `--use-extractors default,-generic`, the
  canonical watch URL we built, only an https HLS result, 30 s, cached 60 s). One `PUBLIC` run serves every viewer; the
  worker's pin is the resolved CDN's registrable domain; policy `serverPullPlatforms: []` turns it off with no network
  call. Never run yt-dlp through a shell or on the raw pasted URL; every call goes through `YtdlpRunnerService` (cap 4,
  a 5th waits up to 30 s; YouTube retried with `player_client=android_vr` only on a bot-check). **Server only (owner
  2026-11-26):** an unreadable link is read once more after 2 s, then it is `LINK_ONLY` with reason
  `SERVER_PULL_UNAVAILABLE`; it NEVER falls back to the viewer's tab audio or microphone (`BROWSER_CAPTURE` is no
  longer chosen; the capture code serves only old sessions). `LINK_ONLY` = session `UNSUPPORTED`, no run, no billing;
  Discord is refused with `LIVE_DISCORD_PRIVATE`. YouTube `@handle` and vanity links are refused with
  `LIVE_YOUTUBE_HANDLE_UNSUPPORTED`.
- **A capture run is private and AUDIO only.** Scope `PRIVATE:<userId>`; mode forced to `AUDIO`; `run.captureSessionId`
  is the only session allowed to push audio (the newest session of the viewer takes it over). No chunk for 20 s →
  `DELAYED`, so accrual stops.
- **Audio is accepted only from a billable, watching session**: state `ACTIVE` or `GRACE` (an allow-list,
  `LIVE_CAPTURE_ACCEPTING_STATES`) and a heartbeat or session start under 20 s old. A PAUSED or silent session gets 409,
  so nobody gets free transcription (security review 2026-11-22). The raw body is proven a `Buffer` with
  `instanceof`, after `Array.isArray`/`typeof` checks (the guards CodeQL recognises), before any `.length` read,
  in the service and again in the WAV parser (CodeQL js/type-confusion).
- **The staff plan slug `admin` must exist in the policy** (`plans.admin`, seed v1 gives 36000 s); a plan without a row
  falls to `defaultPlan` (0 free seconds).
- **Dev frontend needs a restart** (`docker restart claw-frontend`) to see new routes or edits to existing files.
- **Fenced writes.** Every worker commit runs in a transaction that first checks the run's `generation` and status; a stale
  worker or a deleted run writes nothing (architecture section 3).
- **Money rows are immutable.** `LiveUsageCharge` and `LiveProviderCost` carry unique idempotency keys; corrections are
  new compensating rows, and history deletion never deletes them.
- **Policy is data.** Limits, prices, free seconds and the kill switch live in `LivePolicyVersion`, not in env or code.
- **Stream speech is untrusted.** Delimited as data in prompts; model output is schema-validated plain text.
- **Spoken language and context (2026-11-24, ADR-221 batch 5).** A caption's language comes from file-service's
  `[[lang:xx]]` tag, else `scriptLanguage`, else the run's last Latin language (`resolveSpokenLanguage`); never translate
  a caption into its own language. Cards and highlights are BOTH sent to `translateCard`, tagged by
  `cardLanguage` (their own text, never the last caption's language; 2026-11-24 bug: Arabic highlights for an English
  viewer), and `SummaryManager` translates them (FINAL too) BEFORE publishing the originals. Summaries are written in `OUTPUT_LANGUAGE` (the spoken language) and may ask for one
  web search (`LiveResearchClient`, research-service `SEARCH_ONLY`, `platform:live-intelligence`, 1/min, 20/run). A
  URL never reaches a prompt. YouTube channel links get `live_chat?v=<id>` from yt-dlp's printed video id.
- Prisma client is generated to `src/generated/prisma` (git-ignored); `npm run build` and `npm test` generate it.

## Recorded videos and the one-click summary (2026-11-24, ADR-221 batch 6)

- `RECORDED` capability: resolve tries live (`SERVER_PULL`) first, then `RecordedVideoService.probe`; longer than
  policy `recordedVideoMaxSeconds` (3 h) → `LIVE_RECORDED_TOO_LONG`. Scope `PRIVATE:<userId>`, no chat.
- `RecordedChunkSource` downloads once (yt-dlp, run temp dir, printed path must stay inside it) and plays along in 6 s
  chunks; a summary run (`SUMMARY:<userId>` scope, `summarize: true`, RECORDED only) reads 30 s pieces at full speed
  on media time from the run start. Nothing advances unless a viewer of the run is ACTIVE or GRACE.
- **Summary billing:** the run writes `processedMediaSeconds`; a summary session's heartbeat accrues exactly the new
  processed seconds, fenced on `accruedMediaSeconds`, and NEVER wall time (a fall-through over-billed once). Detach
  folds the media processed since the last heartbeat into the final block, and a summary run waits whenever it is more
  than `SUMMARY_MAX_UNBILLED_SECONDS` (180) ahead of what its viewer was billed (security review 2026-11-25). A
  summary's mode is fixed (a run switch would restart its billed count); `switchRun` also resets `accruedMediaSeconds`.
- Facebook share links: one redirect, guarded, on `facebook.com` only, sent as `ClawAI-LinkCheck/1.0` (no client name
  → `/unsupportedbrowser`). Host-matched paths are kept unescaped (yt-dlp matches `@a:1` and `fid=1:2` literally).
- `HLS_PLAYLIST_MAX_BYTES` is 4 MB: a YouTube news channel's 12 h master playlist exceeds 1 MB.
- QA: `scripts/qa/live-platform-sweep.mjs <cases.json>`, `scripts/qa/live-summary-run.mjs` (LIVE_QA_URL), and
  `live-language-matrix.mjs` (accepts RECORDED). Run at most 2-3 cases at once (yt-dlp cap 4 per replica).
- **End of a run:** `RunWorker.summarizeTheRest` summarizes what was never summarized (and samples the last frame)
  before `summarizeFinal`, which only reads SUMMARY cards: a short video used to end with no report. Resolve returns
  `portrait` (reported frame size, else the link shape).

## Round 2 (2026-11-26, ADR-221 addendum)

- **Translations** are checked for the target script (`isInLanguage`) and asked again up to 3 times; never publish a
  "translation" in the source language.
- **Songs:** file-service marks sung lines with ♪; `lyricResearchQuery` searches the longest sung line + "lyrics"
  when the model asked for no search (max 3 per run). Lyrics are never the singer's real state (every prompt says so).
- **Agents:** `LiveCouncilService.draftThenMerge` runs the policy's `councilModelChain` (1..3) in parallel, then the
  main chain merges. Summaries, highlights, FINAL and the report use it; captions never do. Add a new analysis call
  through it, never through `LiveModelClient` directly.
- **Video report:** `ReportManager.writeReport` runs after `summarizeFinal` on `SUMMARY:` runs only: 5-minute parts →
  moments about every 10 s, then the overview; one `REPORT` event (`eventKey: report`) in the viewer's language.
- **Pulling a stream (round 2):** yt-dlp prints `%(http_headers)j`; only an allow-list (user-agent, accept,
  accept-language, referer, origin, sec-fetch-mode) is forwarded to the CDN by the probe and the worker, never a
  cookie (Roya, RaiPlay, Odysee, VK answer 403 without them). An encrypted playlist (`#EXT-X-KEY` other than
  `METHOD=NONE`) is refused at the probe. A second CDN joins the host pin only through the reviewed
  `SERVER_PULL_EXTRA_CDN_SUFFIXES` (TikTok `realcrius.com`, CBS `cbsivideo.com`). A platform is claimed live only after
  a real session produced captions (`live-language-matrix.mjs`, `LIVE_QA_PARALLEL=2`).
