# Live Intelligence — architecture and contracts

Status: **built, dev-stack verified 2026-11-22; not deployed**. Decision record: [ADR-221](../13-adr/adr-221-live-intelligence-shared-live-stream-analysis.md).
Product spec: [live-intelligence-spec.md](../02-business-product/live-intelligence-spec.md).
Owning service: `apps/claw-live-service` (port 4022, database `claw_live`, route `/api/v1/live`).

This file is the contract every part of the build follows. When code and this file disagree, fix one
of them in the same change (rule 63).

## 1. Source access (release-blocking)

YouTube's Developer Policies forbid downloading, caching or separating the audio/video of YouTube
content (III.E.1, III.I.7) and retrieving data by any means other than the API (III.I.14). The server
therefore never downloads, fetches or captures YouTube's media, and never defeats any platform's protection.
**Superseded by owner decisions 2026-11-23 (ADR-221 batches 3 and 4): `SERVER_PULL` on every platform except
Discord** — the server reads a live stream's public playlist (Twitch natively, the rest through yt-dlp; section
"Server pull" below). When it cannot, the rules in this paragraph still apply. Platform streams are analysed only from the **viewer's own
browser tab audio** (`BROWSER_CAPTURE`, below). Capturing YouTube and other platforms this way is an
**owner-accepted terms risk (decision 2026-11-22)**: the owner accepted the terms exposure of viewer-side
capture; it is not a claim that the platforms permit it.

| Source kind | Player                                   | AI                                                               | Access scope                                       |
| ----------- | ---------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| `YOUTUBE`   | `youtube-nocookie` iframe                | `BROWSER_CAPTURE` (viewer tab audio, AUDIO mode only)            | `PRIVATE:<userId>`                                 |
| `PLATFORM`  | the platform's official embed, or a link | `BROWSER_CAPTURE`, `SERVER_PULL` (Twitch), or none (`LINK_ONLY`) | capture `PRIVATE:<userId>`, pull and link `PUBLIC` |
| `HLS`       | hls.js via live-service proxy            | audio, vision                                                    | `PUBLIC` or `PRIVATE:<userId>`                     |
| `FIXTURE`   | hls.js via live-service                  | audio, vision                                                    | `PUBLIC` (admin-enabled fixture)                   |

**Platform registry** (`apps/claw-live-service/src/modules/sources`): the data table
`constants/platform-registry.constants.ts` plus one small parser per platform (`utilities/capture-platform-url.utility.ts`,
`utilities/link-platform-url.utility.ts`, `utilities/youtube-url.utility.ts`), tried in order. Resolution is **parsing
only, never a network call**, except the Twitch server-pull probe when the policy enables it. `sourceIdentity = sha256(<PLATFORM>:<id>)`; `LiveStream.platform` stores the platform.

| Platform                                                                                                                                                  | URL shapes                                                                       | Player embed                                                                    | Chat embed                                                    | Capability                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| YouTube video                                                                                                                                             | `/watch`, `youtu.be`, `/live/`, `/embed`, `/shorts`                              | `youtube-nocookie.com/embed/<id>?autoplay=1&playsinline=1`                      | `youtube.com/live_chat?v=<id>` + frontend `&embed_domain=`    | BROWSER_CAPTURE                                                 |
| YouTube channel                                                                                                                                           | `/channel/UC…[/live]`                                                            | `youtube-nocookie.com/embed/live_stream?channel=<id>`                           | none (needs a video id): link `/channel/<id>/live`            | BROWSER_CAPTURE                                                 |
| Twitch                                                                                                                                                    | `twitch.tv/<channel>` (`www.`, `m.`; not `videos`, `directory`, `p`, `settings`) | `player.twitch.tv/?channel=<c>&autoplay=true` + frontend `&parent=`             | `twitch.tv/embed/<c>/chat?darkpopout` + frontend `&parent=`   | BROWSER_CAPTURE                                                 |
| Kick                                                                                                                                                      | `kick.com/<user>` (not `categories`, `browse`, `video`, `clips`)                 | `player.kick.com/<user>?autoplay=true`                                          | `kick.com/popout/<user>/chat` (frontend falls back to a link) | BROWSER_CAPTURE                                                 |
| Facebook                                                                                                                                                  | `/<page>/videos/<id>`, `/watch/?v=`, `/watch/live/?v=`, `fb.watch/<code>`        | `facebook.com/plugins/video.php?href=<canonical>&show_text=false&autoplay=true` | none: link                                                    | BROWSER_CAPTURE                                                 |
| TikTok, Instagram, Rumble, BIGO, LinkedIn, Telegram (`?livestream`, `?videochat`, `?voicechat`), Bilibili, CHZZK, SOOP (incl. legacy afreecatv.com), Nimo | see the parsers                                                                  | none                                                                            | none                                                          | LINK_ONLY                                                       |
| Discord                                                                                                                                                   | `discord.com/…`, `discord.gg/…`                                                  | —                                                                               | —                                                             | refused `422 LIVE_DISCORD_PRIVATE` (Go Live has no public link) |

- `reasonCode`: `BROWSER_CAPTURE_AVAILABLE`, `SERVER_PULL_AVAILABLE`, `SERVER_PULL_UNAVAILABLE` or `LINK_ONLY_PLATFORM` (`YOUTUBE_ANALYSIS_NOT_PERMITTED` is kept only so old
  clients still parse). `LINK_ONLY` behaves like the old `PLAYER_ONLY`: session `UNSUPPORTED`, no run, no billing.
- YouTube `@handle` and vanity links cannot be resolved without the YouTube API and are refused with
  `LIVE_YOUTUBE_HANDLE_UNSUPPORTED` (paste the video link or the `/channel/UC...` link).
- **Browser capture:** the viewer's browser shares its own tab (`getDisplayMedia`, only the audio is kept), downsamples
  to 16 kHz mono and posts 6 s PCM16 WAV chunks to `POST /sessions/:id/audio` (section 9). A capture run is
  `PRIVATE:<userId>`, so a viewer's capture is never shared with anyone. The run's `captureSessionId` names the one
  session allowed to push audio; a second session of the same viewer on the same stream takes the capture over (the
  older one then gets 409).
- **Microphone capture (batch 3):** where tab audio is unavailable (every mobile browser), the browser captures the
  microphone instead (`getUserMedia`, echo cancellation / noise suppression / auto gain OFF) and posts the same chunks.
  Frontend only (`utilities/live-capture.utility.ts`, source picked by `pickLiveCaptureSource()`).
- **Server pull (batch 3 Twitch, batch 4 every platform but Discord):** `services/server-pull-resolver.service.ts`
  resolves a `ResolvedPull` (playlist + host suffixes). Twitch with `LIVE_TWITCH_CLIENT_ID`: the anonymous playback
  token (honouring `forbidden`) and the usher master playlist. Everything else: `yt-dlp` (argv only, generic extractor
  off, 30 s, only an https HLS result) on the canonical watch URL; the pin is the result's registrable domain. Results
  are cached 60 s; link-only platforms are probed too (live → `SERVER_PULL` with no embed). Resolve probes it when the
  policy's `serverPullPlatforms` lists the platform: live → `SERVER_PULL` (`PUBLIC`, one run for every viewer, any
  device, `reasonCode SERVER_PULL_AVAILABLE`); offline/refused → private `BROWSER_CAPTURE` with
  `SERVER_PULL_UNAVAILABLE`; policy off → no network call. The worker (`HlsChunkSource` with a `ServerPullSource`)
  fetches on the host-suffix pin `ttvnw.net`/`live-video.net`, and drops the token after a failed playlist fetch (at
  most once per 30 s) so the next poll re-resolves (fresh, bypassing the cache). Twitch's pin is
  `ttvnw.net`/`live-video.net`; a yt-dlp pull's pin is its own CDN domain. The player and chat stay the official embeds
  where the platform has one; the feed reveals by wall clock.
- `HLS` requires a per-user **rights attestation** (checkbox + timestamp stored on the session) before
  any processing; each viewer attests for themselves, so sharing a run never extends one user's
  attestation to another.
- A URL carrying a query string, userinfo or a fragment-free signed token is `PRIVATE:<userId>`: its
  analysis is never shared with another user.
- SSRF: only `https:` (and `http:` only when `LIVE_ALLOW_HTTP_SOURCES` is set in dev), resolved address
  must be public (`assertSafeRequestUrl` from `@claw/shared-utilities` + DNS check), no redirects to a
  different host, playlist ≤ 1 MB, segment ≤ 20 MB, allowed content types only.
- The browser plays HLS through `GET /api/v1/live/streams/:streamId/hls/*`, a same-origin proxy that
  rewrites playlist URIs and only fetches hosts equal to the stream's declared host. This keeps the CSP
  unchanged (no `connect-src https:` wildcard) and is not an open proxy.
- `FIXTURE`: a bundled speech recording looped by an ffmpeg broadcaster into a local HLS window with
  `EXT-X-PROGRAM-DATE-TIME`. It is a real live source for QA; nothing about its AI output is mocked.

## 2. Processing identity and sharing

`processingKey = sha256(sourceKind | normalizedSourceIdentity | accessScope | mode | PIPELINE_VERSION)`.
`mode ∈ {AUDIO, AUDIO_VISION, SMART_AUTO}`. One `ProcessingRun` per key may be `ACTIVE` at a time
(emulated partial unique `activeKey`). Viewers of the same key share one run, one transcript and one
summary stream; translation is per language and cached.

## 3. Lifecycle state machines

- **Run:** `PENDING → ACTIVE → (DELAYED ⇄ ACTIVE) → STOPPING → STOPPED | ENDED | FAILED`; `DELETED` is a
  tombstone. First eligible viewer creates/attaches; the last viewer detaching sets `STOPPING`
  immediately; the worker stops at its next chunk boundary (≤ chunk length). `ENDED` = source finished
  (`EXT-X-ENDLIST`/EOF) and produces one `FINAL` card covering only analyzed intervals.
- **Worker lease:** DB row lease on the run (`leaseOwner`, `leaseExpiresAt`, `generation`). Claim =
  `UPDATE … SET generation = generation + 1 … WHERE leaseExpiresAt < now() RETURNING generation`. Every
  commit is fenced: it runs in a transaction that first does
  `updateMany({ where: { id, generation, status in [ACTIVE, DELAYED, STOPPING] } })` and aborts on 0
  rows, so a stale worker or a deleted run can never write. Lease 15 s, renewed every chunk; recovery
  target < 15 s.
- **Capture run:** a `BROWSER_CAPTURE` run has no source end: no chunk for 20 s → `DELAYED` (accrual pauses,
  section 6); the capture session detaching → `STOPPING → STOPPED` as for any run.
- **Viewer session:** `CONNECTING → ACTIVE ⇄ PAUSED → DETACHED`; side states `CREDITS_REQUIRED`,
  `GRACE`, `EXHAUSTED`, `UNSUPPORTED`. Presence lives in Redis (`live:presence:<runId>` ZSET of
  sessionId → last heartbeat). Heartbeat every 10 s; no heartbeat for 30 s = network loss → `DETACHED`
  by the reaper. Explicit close = `DELETE /sessions/:id` (also via `navigator.sendBeacon`). A reconnect
  within 30 s resumes the same session; later it is a new session starting at the Live Edge.
- **Reservation:** `RESERVED → SETTLED | RELEASED` (auth-service PAYG meter).

## 4. Pipeline

`source → chunker (ffmpeg, 6 s audio chunks, 16 kHz mono) → STT → segment → context memory → topic +
summary + highlights (cheap LLM, adaptive) → translation (per active language, cached) → persisted
events → Redis fan-out → SSE`.

- **Capture input:** for a `BROWSER_CAPTURE` run the chunker is replaced by the Redis list `live:capture:<runId>`
  (RPUSH by the audio route, LTRIM to the newest 20, 120 s TTL). Each worker tick `LPOP`s up to 20 chunks
  (`workers/capture-chunk-source.ts`): no source fetch, no ffmpeg input. Media time = `X-Chunk-Start-At`, end = start +
  WAV duration. From there the path is identical: same STT, fencing, cost rows and latency field (speech end → commit).
  Mode is forced to `AUDIO` (tab audio carries no frames); a mode change on a capture session is ignored.
- **STT:** file-service `POST /api/v1/internal/files/transcribe-chunk` (platform-paid, Service auth):
  the existing ranked provider walk (Gemini → OpenAI → local faster-whisper), returns
  `{ text, language, provider, model, durationSeconds, costMicroUsd }`. Empty/no-speech is recorded
  as a gap, never invented text. Low-confidence or truncated chunks set `uncertain = true`.
- **Summaries:** platform-paid model chain (pattern of threads-service `TranslationModelClient`), cheap
  first. Called when ≥ 30 s of new transcript accumulated, or a pause in speech ≥ 8 s, never per chunk.
  Input = working summary + current topic + last ≤ 90 s of transcript (never the whole stream). Output
  is strict JSON validated by Zod: `{ topicShift, current: {title, summary, importance}, highlights[] }`.
  `topicShift = false` updates the current card (new `FeedEventVersion`); `true` closes it and opens a
  new one. Near-duplicate highlights (same type, ≥ 0.8 token-set similarity within 120 s) are dropped.
- **Memory:** short-term = working summary + current topic + recent segments (in the run's worker);
  long-term = `LiveMemorySnapshot` every 10 min (compacted summary + key facts) and the persisted feed.
- **Vision:** `AUDIO_VISION` samples one frame / 15 s, keeps it only if ffmpeg scene score ≥ 0.3 or
  ≥ 60 s since last kept frame; `SMART_AUTO` adds vision only when the last 30 s had no speech or a scene
  change fired. Frames go to a vision-capable cheap model; results become `VISUAL` notes in the summary
  input. No frame → no visual claim.
- **Translation:** captions and cards are translated only for languages with ≥ 1 active viewer, cached in
  `LiveTranslation (targetKind, targetId, language, sourceVersion)`. Content is wrapped as data in the
  prompt; output with new links/markup is rejected (ADR-217 rule).
- **Prompt injection:** stream speech is untrusted data: delimited, never concatenated into the system
  prompt, model output is schema-validated and plain-text only.

## 5. Time model

All event times are **media wall-clock epoch milliseconds** (`mediaAt`), taken from
`EXT-X-PROGRAM-DATE-TIME` when present, else from capture time. The client maps its playback position
to media time (`hls.playingDate`, else live-edge estimate) and reveals only events with
`startAt ≤ playbackAt` — never future events. Pause freezes the visible feed; seek re-filters it.
Four clocks are kept apart: media time (`mediaAt`), processing time (`processedAt`), playback time
(client), session time (`activeSeconds`, server-side).

On resume: if the paused position is still in the HLS seekable window (DVR), continue from it; else
jump to Live Edge and record a `GAP` coverage marker. Coverage intervals (`LiveSessionCoverage`) are
written from heartbeats: `[fromAt, toAt]` of media time actually played while AI was active. History is
the run's events intersected with the user's coverage — never retroactive.

## 6. Billing (hybrid)

- Unit: eligible active AI viewing seconds per (user, run); two devices on the same run count once.
- Accrues only while the viewer is `ACTIVE` (playing), the run is `ACTIVE` (not `DELAYED` > 20 s), and
  heartbeats arrive (a gap > 15 s accrues nothing). Paused = 0.
- Settled in 60-second blocks: free monthly seconds first (atomic conditional update on
  `LiveUsageMonth`), then paid only if the session holds an explicit approval (optional spending cap):
  reserve one block via `PaygMeter.reserve` (`PaygSurface.LIVE_INTELLIGENCE`, requestId
  `live:<sessionId>:<blockIndex>`), finalize on delivered seconds, release if undelivered.
  The block is priced by the policy, not by a rate row: reserve and finalize send
  `fixedCostMicroUsd = ceil(paidMicroUsdPerMinute × seconds / 60)` with zero tokens and units
  (provider/model `CLAW_LIVE`/`live-intelligence` are ledger labels only), and auth holds exactly
  that and settles `min(price, hold)` (rule 37 item 25).
- Exhaustion: one 60 s grace per exhaustion episode (`LiveBillingState.graceConsumed`); reconnecting
  cannot reset it; a later successful paid block ends the episode. After grace the AI stops for that
  viewer; the player keeps playing.
- Vision and enhancements are charged at actual model usage (enhancement: user-picked model through
  the user-billed path, estimate shown first). Shared provider cost is recorded once in
  `LiveProviderCost` and never charged per viewer beyond the per-minute price.
- Charges are immutable `LiveUsageCharge` rows (`idempotencyKey @unique`); corrections are new
  compensating rows. Policy changes never touch finalized rows (each charge stores `policyVersion`).
- Admission control: `maxActiveStreams`, per-user concurrent sessions, and a global daily provider
  budget; at 80 % new runs are refused (`CAPACITY`), at 100 % active runs stop.

## 7. Data model (`claw_live`)

`LiveStream` (`platform LivePlatform?`), `LiveProcessingRun` (`captureSessionId String?`), `LiveTranscriptSegment (runId, seq) @unique`,
`LiveFeedEvent (runId, eventKey) @unique` + `LiveFeedEventVersion`, `LiveTranslation`,
`LiveMemorySnapshot`, `LiveViewerSession`, `LiveSessionCoverage`, `LiveEnhancement`, `LiveUsageMonth
(userId, month) @unique`, `LiveUsageCharge (idempotencyKey) @unique`, `LiveBillingState (userId)`,
`LiveProviderCost (idempotencyKey) @unique`, `LivePolicyVersion`, `LiveRunTombstone`. Cursor pagination
on `(createdAt, id)`. Financial rows are never deleted by history deletion (they drop the content
link instead).

## 8. Deletion

`DELETE /api/v1/live/history` (or one session): in one transaction remove the user's sessions,
coverage and enhancements; for every run they referenced that is not active and has no remaining
coverage from any user, delete its segments, events, versions, translations and snapshots and insert a
`LiveRunTombstone`; Redis replay buffers for those runs are cleared. Fencing (section 3) stops a late
worker from recreating rows. `user.deleted` triggers the same path.

Orphan-run sweeper: every 300 s, under the Redis lock `live:lock:orphan-run-sweep`, up to 20 finished runs that no
session and no coverage references are tombstoned the same way and their replay buffers cleared. It catches runs left
behind when the last viewer's session ended after the run did.

## 9. API (all under `/api/v1/live`, user auth unless noted)

| Method + path                                           | Purpose                                                                 |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `POST /sources/resolve`                                 | `{ url }` → resolution view (wire contract below); writes nothing       |
| `POST /sessions`                                        | start/attach: `{ url, language, mode, attestRights }`                   |
| `POST /sessions/:id/heartbeat`                          | `{ state: PLAYING\|PAUSED, playbackAt, atLiveEdge, seekableFromAt? }`   |
| `POST /sessions/:id/approve-credits`                    | `{ spendingCapMicroUsd? }`                                              |
| `PATCH /sessions/:id`                                   | change language/mode                                                    |
| `DELETE /sessions/:id`                                  | explicit close (detach)                                                 |
| `GET /sessions/:id/stream` (SSE)                        | caption/card/highlight/status events, `Last-Event-ID` replay            |
| `GET /history?cursor=`                                  | the user's sessions, newest first                                       |
| `GET /history/:sessionId/events?cursor=`                | feed within coverage                                                    |
| `GET /events/:eventId/versions`                         | summary version history                                                 |
| `POST /events/:eventId/enhance`                         | `{ modelId, provider?, confirm }` (estimate first when `confirm=false`) |
| `POST /history/:sessionId/export`                       | `{ format: PDF\|MARKDOWN\|TXT }`                                        |
| `DELETE /history`, `DELETE /history/:sessionId`         | deletion (section 8)                                                    |
| `GET /usage`                                            | this month's free seconds (total, used), price, grace, policy version   |
| `GET /admin/overview?days=1\|7\|30` (ADMIN_LIVE_MANAGE) | active runs, totals, AI latency, money                                  |
| `POST /admin/runs/:runId/stop` (ADMIN_LIVE_MANAGE)      | emergency stop of one run                                               |
| `POST /sessions/:id/close` (public, beacon)             | `navigator.sendBeacon` close with `{ token }`                           |
| `GET/PUT /admin/policy`, `POST /admin/policy/rollback`  | versioned policy                                                        |
| `GET /streams/:id/hls/*`                                | same-origin HLS proxy (session-bound; HLS and FIXTURE only)             |
| `POST /sessions/:id/audio`                              | browser capture: one raw `audio/wav` tab-audio chunk → `202`            |

SSE event types: `caption`, `caption_translation`, `card`, `card_version`, `highlight`, `status`
(any `LiveStatusCode`: run-wide `ANALYZING`, `DELAYED`, `RECOVERING`, `ENDED`, `CAPACITY`; session-scoped
`CREDITS_REQUIRED`, `GRACE`, `EXHAUSTED`, `COMPLETED` on detach), `usage` (reserved: the filter
forwards it only session-scoped, but nothing publishes it yet; the heartbeat response carries usage).
Payload ≤ 8 KB each. Fan-out: Redis channel `claw:live:run:<runId>` + replay list (Lua publish script
pattern of chat-service `CHAT_STREAM_PUBLISH_SCRIPT`).

### Wire contract (what the code returns; the frontend mirrors it in `src/types/live*.ts`)

| Endpoint / frame                                                      | Request                                                                                                                                           | Response                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SSE frame                                                             | —                                                                                                                                                 | `id: <runId>:<seq>`, `event: <type>`, one `data:` line holding the whole envelope `{ id, seq, type, runId, startAt, endAt?, language?, status?, data }` (the type is inside the JSON too). Comment lines `: connected`, `: heartbeat` (15 s). Media times are epoch-ms numbers                                                                                                                                                                                                                                                                                                                                                                               |
| `caption` data                                                        | —                                                                                                                                                 | `{ segmentId, seq, text, language, uncertain }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `caption_translation`                                                 | —                                                                                                                                                 | top-level `language`; data `{ segmentId, seq, text }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `card` / `card_version` / `highlight` data                            | —                                                                                                                                                 | `{ eventId, eventKey, kind, highlightType, title, body, importance, confidence, version, isOpen }` (vision cards omit `highlightType`, `importance`, `confidence`). A translated copy has top-level `language` and data `{ eventId, version, title, body }`                                                                                                                                                                                                                                                                                                                                                                                                  |
| `status` data                                                         | —                                                                                                                                                 | run-wide: `{}`; session-scoped: `{ sessionId, sessionState, reason? }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `POST /sources/resolve`                                               | `{ url }`                                                                                                                                         | `{ sourceKind, capability, embedUrl, reasonCode, platform, chatEmbedUrl, watchUrl, embedNeedsParent, chatNeedsEmbedDomain }` (`platform` null and `watchUrl` `''` for HLS/FIXTURE; the pasted URL is never echoed)                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `POST /sessions`                                                      | `{ url, language, mode, attestRights }`                                                                                                           | `{ sessionId, runId, streamId, sourceKind, capability, embedUrl, platform, chatEmbedUrl, watchUrl, embedNeedsParent, chatNeedsEmbedDomain, playbackUrl, state: LiveSessionState, usage, closeToken }`                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `usage` block                                                         | —                                                                                                                                                 | `{ billedSeconds, pendingSeconds, spentMicroUsd, paidApproved, spendingCapMicroUsd, month: <GET /usage> }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `POST /sessions/:id/heartbeat`                                        | `seekableFromAt` is optional, **not nullable** (omit it)                                                                                          | `{ state, statusCode, usage }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `POST /sessions/:id/approve-credits`, `PATCH`, `DELETE /sessions/:id` | `{ spendingCapMicroUsd? }` / `{ language?, mode? }` / —                                                                                           | `{ sessionId, state, language, runId }` (no usage)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `POST /sessions/:id/audio`                                            | raw body, `Content-Type: audio/wav`, at most 400 KB, PCM16 mono 16 kHz, 1–8 s; header `X-Chunk-Start-At: <epoch ms>` within ±2 min of server time | `202 { accepted: true }`. Checks in order: 404 not the owner; 409 `LIVE_CAPTURE_SESSION_INACTIVE` (accepted only in ACTIVE or GRACE, the billable states, with a heartbeat or session start in the last 20 s, so a PAUSED or silent session cannot get free transcription); 422 `LIVE_CAPTURE_NOT_SUPPORTED` (not BROWSER_CAPTURE); 409 `LIVE_CAPTURE_SESSION_MISMATCH` (not the run's `captureSessionId`); 429 `LIVE_CAPTURE_RATE_LIMITED` (under 3 s since this session's last chunk); 422 `LIVE_CAPTURE_AUDIO_INVALID`; 422 `LIVE_CAPTURE_CHUNK_TIME_INVALID`; 413 over 400 KB. The raw parser (`express.raw`) is mounted in `main.ts` for this path only |
| `POST /sessions/:id/close`                                            | JSON `{ token }` or text/plain token                                                                                                              | `{ closed }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `GET /usage`                                                          | —                                                                                                                                                 | `{ month, freeSecondsTotal, freeSecondsUsed, paidMicroUsdPerMinute, graceSeconds, policyVersion }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `GET /history?cursor=&limit=`                                         | opaque base64url cursor                                                                                                                           | `{ items: [{ id, runId, streamId, title, sourceKind, sourceUrl\|null, mode, language, state, startedAt, detachedAt, billedSeconds }], nextCursor }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `GET /history/:id/events?cursor=&limit=&language=`                    | —                                                                                                                                                 | `{ items: [{ id, eventKey, kind, highlightType, startAt, endAt, importance, confidence, title, body, evidence, version, translated }], nextCursor }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `GET /events/:id/versions`                                            | —                                                                                                                                                 | `[{ version, title, body, createdAt }]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `POST /events/:id/enhance`                                            | `{ modelId, provider?, confirm }` (`modelId` = `provider/model`, or the bare model with `provider`); optional `Idempotency-Key` header            | `confirm=false`: `{ confirmed: false, eventId, eventVersion, modelId, estimatedMicroUsd }`; `confirm=true`: `{ confirmed: true, enhancementId, eventId, eventVersion, modelId, body, costMicroUsd, replayed }`                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `POST /history/:id/export`                                            | `{ format: PDF\|MARKDOWN\|TXT }`                                                                                                                  | binary file, `Content-Disposition: attachment`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `DELETE /history`, `DELETE /history/:id`                              | —                                                                                                                                                 | `{ sessionsDeleted, skippedActive, runsDeleted }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `GET /admin/overview`                                                 | `days` 1, 7 or 30 (default 1)                                                                                                                     | `{ windowDays, activeRuns: [{ runId, sourceKind, title, status, mode, viewers, startedAt, lastCommitAt, lagSeconds, failureCode, leaseOwner }], totals: { activeRuns, activeViewers, runsFailed, delayedRuns }, ai: { sttP50Ms, sttP95Ms, summaryP50Ms, summaryP95Ms, translationP95Ms, visionCalls, retryOrFailureRate, uncertainSegments }, money: { providerCostMicroUsd, revenueMicroUsd, grossMarginMicroUsd, … } }`                                                                                                                                                                                                                                    |
| `POST /admin/runs/:runId/stop`                                        | —                                                                                                                                                 | `{ runId, status }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `GET /admin/policy`                                                   | —                                                                                                                                                 | `{ active: PolicyVersion\|null, versions: PolicyVersion[] }`, `PolicyVersion = { version, active, config, note, createdBy, createdAt }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `PUT /admin/policy`, `POST /admin/policy/rollback`                    | `{ config, note? }` / `{ version, note? }` (`note` 1..500 chars when present; omit when blank)                                                    | the new `PolicyVersion`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## 10. Targets (benchmarks required, not guarantees)

Caption latency is recorded as speech end to commit (`latencyMs`) on the STT `LiveProviderCost` rows.
Caption p95 ≤ 3 s is **not reachable** with chunked batch STT (decision 2026-11-22): expected 7–12 s.
Translation p95 ≤ 5 s after the caption; summary p95 ≤ 10 s after a topic closes; worker recovery
< 15 s; zero duplicate visible events (eventKey unique) and zero duplicate charges (idempotencyKey).

## 11. Recorded videos and the one-click summary (ADR-221 batch 6, 2026-11-24)

- Capabilities: `SERVER_PULL` (live, shared, `PUBLIC`), `RECORDED` (recorded, `PRIVATE:<userId>`), a summary
  (`RECORDED` on scope `SUMMARY:<userId>`), `BROWSER_CAPTURE`, `LINK_ONLY`. Resolve order: registry parse → Facebook
  share redirect (one hop, guarded) → live probe → recorded probe (bounded by policy `recordedVideoMaxSeconds`).
- `RecordedChunkSource`: yt-dlp download into the run temp dir, ffmpeg on the local file only; play-along cuts 6 s
  chunks on its clock, a summary 30 s pieces at full speed on media time from the run start. It advances only while a
  viewer of the run is ACTIVE or GRACE.
- Billing for a summary: the run's `processedMediaSeconds` (fenced write) is accrued into the session by heartbeats,
  fenced on `accruedMediaSeconds`; wall time is never accrued for a summary.

## What would make this stale

A streaming STT vendor added; YouTube granting caption access; a platform adding or withdrawing an official player
or chat embed; the browser-capture risk decision being revisited; a second owning service; any change to
the billing unit or grace semantics.
