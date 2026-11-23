# ADR-221: Live Intelligence analyzes authorized live streams once and shares the result

**Status:** Accepted

**Date:** 2026-11-22

Rules: [rule 28](../../rules/28-billing-integrity-and-api-contracts.md), [rule 37](../../rules/37-payg-credit-integrity.md), [rule 08](../../rules/08-security-rules.md), [rule 17](../../rules/17-rabbitmq-events-and-jobs.md). Related: [ADR-216](adr-216-audio-video-reads-are-billed-transcripts.md), [ADR-217](adr-217-published-threads-are-translated-into-every-app-language.md).
Contract: [live-intelligence-architecture.md](../03-architecture/live-intelligence-architecture.md).

## Context

The owner asked for live captions, translation, summaries and highlights on live streams such as
YouTube Live, shared across viewers and billed per watched second. YouTube's Developer Policies forbid
downloading, caching or separating the audio/video of YouTube content (III.E.1, III.I.7) and retrieving
data by any means other than the API (III.I.14). The IFrame Player API gives playback state and time,
not caption text, and `captions.download` needs edit permission on the video.

## Decision

1. **Sources.** YouTube links play in a `youtube-nocookie` iframe with AI disabled and an honest
   "not supported" state. AI runs only on HLS sources the viewer attests they have rights to analyze,
   and on an admin-enabled fixture stream. Owner decision, 2026-11-22.
2. **A new service, `claw-live-service`** (port 4022, `claw_live`), owns streams, runs, transcripts,
   feed, sessions, usage and policy. It reuses file-service's transcription walk through a new
   platform-paid internal endpoint, auth-service's PAYG meter (`PaygSurface.LIVE_INTELLIGENCE`), the
   Redis publish-and-replay pattern from chat-service, and the cheap model chain pattern from
   threads-service.
3. **One run per processing key** (source identity, access scope, mode, pipeline version). DB row lease
   with a generation fencing token. Every write is fenced, so a stale worker or a deleted run cannot
   commit.
4. **Chunked STT on existing providers** (6 s chunks). Caption latency is about 7–12 s, which is
   accepted and documented. A streaming vendor was rejected for now: it would mean a new vendor and a key.
5. **Hybrid billing.** Server-measured active seconds are settled in 60 s blocks: free monthly seconds
   first, then paid credit only after explicit approval. One 60 s grace per exhaustion episode.
   Shared provider cost is recorded once. Charges are immutable and idempotent.
6. **The same-origin HLS proxy** keeps the CSP closed and is host-pinned to each stream, so it is not
   an open proxy.

## Alternatives rejected

- Server-side capture of YouTube audio (yt-dlp style): forbidden by policy.
- Tab-audio capture by the viewer: legally unclear under III.I.7.
- Owner OAuth captions: needs a verified Google OAuth app. It can be added later.
- A new streaming STT vendor: more cost and a new key, for a latency target that is nice to have.
- Relaxing the CSP to `connect-src https:` for arbitrary HLS hosts: weakens XSS exfiltration defense.

## Consequences

- Public YouTube Live streams cannot be analyzed. The feature's value depends on authorized HLS sources.
- The 3 s caption SLO is not met. Benchmarks are recorded in the QA evidence.
- The live-service proxy carries the HLS bandwidth of its viewers.

## What would make this stale

YouTube grants caption or audio access, a streaming STT vendor is added, or the billing unit changes.

## Addendum 2026-11-22

- **Fixed-price PAYG surface.** The live block price comes from the versioned policy, not a routing rate. live-service
  sends `fixedCostMicroUsd` on reserve and finalize with zero tokens and units; auth-service accepts it only for a surface
  in `FIXED_PRICE_SURFACES` (`LIVE_INTELLIGENCE`) and settles `min(price, hold)`.
- **PDF export** uses a new stateless file-generation endpoint, `POST /api/v1/internal/file-generations/render-pdf`
  (Markdown in, PDF bytes out, nothing stored), not a generation row.
- **YouTube channel links** (`/channel/UC...`) play through the `youtube-nocookie` `live_stream` embed, player only.
  `@handle` links are refused with `LIVE_YOUTUBE_HANDLE_UNSUPPORTED`. Still no capture of YouTube audio or captions.
- **Orphan-run sweeper** (every 300 s, Redis lock) tombstones finished runs that no session or coverage references.
- Caption latency is recorded as speech end to commit on STT provider-cost rows. Built and verified on the dev stack;
  not deployed.

## Addendum 2026-11-22 (batch 2): platforms, live chat, browser capture

- **Owner decision:** YouTube must get AI. It does so through **viewer tab-audio capture**: the viewer's own browser
  shares the tab, and only its audio goes to `POST /api/v1/live/sessions/:id/audio` (6 s PCM16 16 kHz WAV). The owner
  accepts the platforms' terms risk (YouTube Developer Policies III.I.7). Server-side download or capture of any platform
  is still never built. A capture run is `PRIVATE:<userId>` and never shared.
- **15 platforms:** YouTube, Twitch, Kick and Facebook embed (capability `BROWSER_CAPTURE`). TikTok LIVE, Instagram,
  Rumble, BIGO, LinkedIn, Telegram, Bilibili, CHZZK, SOOP and Nimo TV are `LINK_ONLY` ("Watch on <Platform>"). Discord
  Go Live is refused (`LIVE_DISCORD_PRIVATE`): it has no public link. Links are parsed and never fetched.
- **Live chat:** official chat embeds for a YouTube video (`live_chat`, `embed_domain`), Twitch (`parent`) and Kick.
  Every other platform gets an "Open chat on <Platform>" link.
- Schema: `LiveSourceKind.PLATFORM`, `LiveCapability.LINK_ONLY|BROWSER_CAPTURE`, enum `LivePlatform`,
  `live_streams.platform`, `live_processing_runs.capture_session_id` (additive migration `20261122120000`).

## Addendum 2026-11-23 (batch 3): microphone capture and Twitch server pull

- **Problem:** no mobile browser implements `getDisplayMedia`, so on a phone "Analyze with my browser" was a dead end
  ("This browser can't share tab audio").
- **Microphone capture (owner decision 2026-11-23):** when tab audio is unavailable the viewer's browser captures its
  **microphone** (`getUserMedia`, echo cancellation, noise suppression and auto gain OFF, or the speaker's own sound is
  cancelled out) and posts the same 6 s 16 kHz WAV chunks. Frontend only: the server cannot tell the sources apart, and
  billing is identical. Quality depends on the room; the UI says so.
- **Server pull (owner decision 2026-11-23, "server pull 100%"):** this **reverses, for Twitch only**, the batch-2 line
  "server-side download or capture of any platform is never built". New capability `SERVER_PULL`: the server reads the
  platform's public playlist the way its own web player does, so one `PUBLIC` run serves every viewer, on any device.
  - **Twitch:** the anonymous playback token Twitch's web player requests (`gql.twitch.tv`, public web client id) and
    the usher master playlist. A token that says `forbidden` (geo-block, sub-only) is honoured. The client id lives in
    `LIVE_TWITCH_CLIENT_ID` (env, empty = off), not in code: gitleaks' provider rule `twitch-api-token` matches it and
    the repo never allowlists provider rules (owner decision 2026-11-23).
  - **YouTube: not built.** The watch page no longer carries `hlsManifestUrl`; a playlist needs impersonating another
    client to dodge YouTube's attestation (PO tokens). **Kick: not built.** Its API answers servers with
    `403 Request blocked by security policy`. Defeating either protection is circumvention and stays out; both remain
    `BROWSER_CAPTURE` (tab or microphone).
  - **Owner-accepted terms risk:** Twitch's terms do not grant third-party server access to streams. The owner accepted
    this exposure; it is not a claim that Twitch permits it. Admin can switch it off per platform
    (`serverPullPlatforms`, policy field, default `['TWITCH']`; `[]` = browser capture only, no network call).
- Resolve probes the playlist (token + one playlist fetch, 5 s timeouts). Live → `SERVER_PULL` / `SERVER_PULL_AVAILABLE`;
  offline or refused → private `BROWSER_CAPTURE` / `SERVER_PULL_UNAVAILABLE`.
- Every request keeps the SSRF guard and DNS pinning; the CDN pin is a host-suffix list (`ttvnw.net`,
  `live-video.net`), never a look-alike. A playlist failure drops the token at most once per 30 s, so the next poll
  resolves a fresh one; the worker's poll-failure ceiling still ends a stream that went offline.
- Vision on: the lightest rendition **with video** (Twitch `160p30`); audio only: the audio-only rendition.
- Schema: `LiveCapability.SERVER_PULL` (additive migration `20261123000000_live_server_pull`). Device audio for a
  `SERVER_PULL` session is refused (`422`).
- **What would make this stale:** Twitch changing its token flow or blocking server requests (resolve then falls back
  to capture by itself); YouTube or Kick offering a sanctioned server playlist; the owner withdrawing the terms risk.

## Addendum 2026-11-23 (batch 4): server pull on every platform

- **Owner decision 2026-11-23:** "the mic workaround is 50/50, we need a concrete solution from the server, for all
  providers". This **reverses the batch-3 refusal** for YouTube, Kick and the rest: the owner accepted the terms risk of
  reading every platform's public stream on the server. It is an owner business decision, not a claim that the
  platforms permit it.
- **How:** Twitch keeps its native token path (`LIVE_TWITCH_CLIENT_ID`; empty now means "use yt-dlp" instead of "off").
  Every other platform, and Twitch without the id, asks **yt-dlp** for the stream's HLS URL:
  `yt-dlp --no-config --js-runtimes node --use-extractors default,-generic --format <worst HLS> --print
"%(protocol)s %(url)s" -- <canonical watch URL>`. No shell, argv only, 30 s timeout, 16 KiB output cap
  (`runBoundedProcess`). Only an `https` HLS result is accepted; anything else is "not readable".
- **Safety kept:** the input is the watch URL **we** built from the parsed id, never the raw paste; the `generic`
  extractor is off so no URL can make yt-dlp fetch an arbitrary host; every playlist and segment is still fetched by
  our SSRF-guarded, DNS-pinned fetcher on a host-suffix pin = the resolved URL's registrable domain
  (`manifest.googlevideo.com` → `googlevideo.com`).
- **Link-only platforms upgrade too:** TikTok LIVE, Rumble, BIGO, Bilibili, CHZZK, SOOP, Nimo, LinkedIn and Telegram are
  probed; a live one is `SERVER_PULL` with no embed (the page shows "Watch on …" plus the analysis feed), an offline or
  unreadable one stays `LINK_ONLY`. YouTube, Kick, Facebook and offline Twitch fall back to `BROWSER_CAPTURE` with
  `SERVER_PULL_UNAVAILABLE`. Discord stays refused. Instagram Live has no yt-dlp live support and stays link-only.
- At most 4 yt-dlp runs at once per replica (`YTDLP_MAX_CONCURRENT`); past that a resolve answers "not readable" at
  once and the stream falls back (security review 2026-11-23: unbounded subprocess spawn).
- A resolved URL is cached 60 s per stream (resolve-time probe and the worker's first poll spawn yt-dlp once); a token
  refresh passes `fresh` and bypasses the cache.
- **Binary:** the standalone `yt-dlp_linux` release, pinned by version and SHA-256 in both Dockerfiles (`ARG
YTDLP_VERSION`, `ARG YTDLP_SHA256`); Node in the image is its JavaScript runtime. Missing binary = pull unavailable,
  capture fallback.
- **Policy:** `serverPullPlatforms` accepts every platform except Discord; default (field absent) = all; the admin form
  is one switch (all or none). The seeder writes the full list for a fresh database.
- **Verified 2026-11-23:** from the production server's IP, yt-dlp returned live HLS for YouTube (Al Jazeera English)
  and Kick in about 2 s each; locally, `live-server-pull-smoke.mjs` 20/20 with real captions from YouTube, Kick and
  Twitch.
- **What would make this stale:** a platform blocking datacenter IPs or changing its player (yt-dlp then needs a version
  bump: change both ARGs); the owner withdrawing the terms risk (publish `serverPullPlatforms: []`).
