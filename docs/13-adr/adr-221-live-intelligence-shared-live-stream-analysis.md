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

## Addendum 2026-11-24 (batch 5): spoken language, context-aware feed, themed chat, UI

- **Owner request 2026-11-24:** captions in the viewer's language (exact words when the speaker already speaks it, a
  translation otherwise, never the original first), a smarter and faster feed that knows what it is watching (a song is
  a song, with its singer and country), analysis that works in any language, and a live chat that is readable in dark
  and light mode.
- **Root cause found:** every caption was stored with `language: null` (Gemini reports no language), so the server
  "translated" Arabic to Arabic and the page showed the original, then swapped in the copy.
- **Spoken language.** file-service's Live chunk instruction (`TRANSCRIBE_CHUNK_INSTRUCTION`) asks for a
  `[[lang:xx]]` tag before the words, transcribes sung lyrics, never translates; the tag is stripped
  (`splitChunkLanguageTag`). live-service falls back to the writing system (`scriptLanguage`: Arabic, Persian, Urdu,
  Hebrew, Cyrillic, Ukrainian, Greek, Devanagari, Bengali, Tamil, Telugu, Thai, Hangul, Kana, Han, Georgian, Armenian,
  Ethiopic) and lets a Latin line inherit the run's last Latin language only (`resolveSpokenLanguage`).
- **Captions in the UI.** `revealLiveCaptions`: same base language → the exact words; otherwise the translation; while
  it is on the way the caption is hidden, and only after `LIVE_CAPTION_TRANSLATION_WAIT_MS` (12 s) does the original
  show. The overlay sits at the TOP over a platform iframe (the platform's own captions own the bottom).
- **Feed.** The summarizer prompt asks the model to name the content type, to say "singing" for sung words and name the
  song, artist and country when sure, to use the visual notes and web context, to write in `OUTPUT_LANGUAGE` (the
  spoken language) and to emit up to 4 highlights. Cards come every ~18 s of speech or a 6 s pause (were 30 s / 8 s);
  vision samples every 10 s with on-screen text; people are never identified from their face.
- **Research.** The model may return a `researchQuery`; live-service runs research-service `SEARCH_ONLY` as
  `platform:live-intelligence` (`LiveResearchClient`), at most one per minute and 20 per run, never the same query
  twice. Title, snippet and host reach the next prompt as `WEB_CONTEXT`; a URL never does. Failure = no context.
  `RESEARCH_SERVICE_URL` defaults to `https://research-service:4016` (already in the root `.env`); no new env var.
- **Live chat theme.** The page adds YouTube `dark_theme=1` and Twitch `darkpopout` only in dark mode and gives the
  iframe a matching `color-scheme` (a mismatched scheme paints an opaque white canvas: white text on white). Kick's
  popout is dark only. A YouTube channel link now gets its live chat: yt-dlp prints the live video id
  (`%(protocol)s %(url)s %(id)s`) and resolve builds `live_chat?v=<id>`.
- **UI.** Full-screen modal on phones, a LIVE badge, an "AI Analysis" panel with icon tabs that never wrap, cards with
  a coloured edge per kind and importance dots, popovers with padding, an Export menu instead of three buttons, a usage
  bar.
- **Verified 2026-11-24 locally:** `live-language-matrix.mjs` rounds (French→English, Arabic→Arabic, Arabic→English,
  English→Arabic) 18/18 with language detected on every caption, no same-language translation, and translations for
  the rest; a stream of songs produced "Someone sings 'Let It Snow!' … a traditional American winter song". Browser
  lane on desktop, phone and tablet, dark and light: every tab, Enhance, Versions, Export (PDF/Markdown/Text), Open,
  Delete.
- **CodeQL `js/request-forgery`** flagged the redirect Location reaching `pinnedGet`. Accepted in
  `tools/security/codeql-accepted.json` like the shared HTTP chokepoint: every caller is guarded first, each redirect hop
  is re-guarded on the same CDN suffixes (at most 3, https only) and the connection stays DNS-pinned.
- **Not done / honest gaps:** a stream whose owner disables embedding still shows "This video is unavailable" in the
  player (we cannot see that inside a cross-origin frame; "Watch on" stays under it); research cost is recorded by
  research-service, not as a `LiveProviderCost` row (no `RESEARCH` pipeline stage yet); Kick chat is dark in light mode.
- **Fix 2026-11-24 (batch 5b): highlights stayed in the spoken language.** The owner chose English, watched an
  Arabic stream and read Arabic highlights. Two causes: `SummaryManager.apply` handed only the summary card to
  `TranslationManager.translateCard` (highlights were never translated), and a card was tagged with the last
  caption's language instead of the language it was written in. Now every new highlight is translated too, and a card's
  language is `cardLanguage(title, body, requested)`: its own script, a Latin text keeps a requested Latin language,
  otherwise unknown (translated for everyone). Rule restated by the owner: the viewer's language equals the spoken
  language → the exact words, only the other-language parts translated; a different language → everything translated
  (captions, summary cards and highlights). `live-language-matrix.mjs` now fails when a card or highlight in another
  script has no copy in the viewer's language; 21/21 on Arabic→English, mixed Arabic/English→English, Hindi→English
  and Spanish→Arabic.
- **Translation first, then the card.** `SummaryManager` now translates every changed card, highlight and the FINAL
  card (`translateBeforePublish`) between the commit and the publish, so the viewer's copy reaches the page before the
  original; a failed translation never holds a card back. The page keeps a copy that arrives first in
  `cardTranslations` (`eventId:version`) and dresses the card with it when it lands. Same-language viewers wait for the
  other languages' translations (a few seconds per summary) — accepted: no original ever flashes for anyone. The FINAL
  card was never translated before; it is now. Browser check: Arabic stream, English page, 120 samples over 3 minutes,
  0 with Arabic text.

## Addendum 2026-11-24/25 (batch 6): Live & Videos — recorded videos, 34 tested platforms, one-click summary

- **Owner report:** Facebook `share/v` and `share/r` links, an Instagram reel and a `vt.tiktok.com` link all failed
  with `LIVE_SOURCE_UNSUPPORTED`. All six were recorded videos, not live streams; the registry only knew live links.
- **Owner decisions (2026-11-24):** recorded videos are analysed (play along at normal speed, private run per
  viewer, billed per watched second like live); at most 3 hours (policy `recordedVideoMaxSeconds`, 0 = off, ceiling
  12 h); every recommended platform is added and any that fails a real test is dropped from the public claims; the
  feature is renamed **Live & Videos** (nav) / **Live & Video Intelligence** (title); a one-click **Summarize video**
  button sits beside play-along, billed as the video's length in Live minutes (free first, then the same per-minute
  price, approved before it runs) and returns the full report (summary, key moments with times, highlights, full
  transcript; saved in history, exportable); the public page is rewritten at the same URL plus a platforms page.
- **New capability `RECORDED`** (migration `20261124120000_live_recorded_and_platforms`, enum values only). Resolve
  asks yt-dlp first for a live HLS stream (`SERVER_PULL`, unchanged), then for a recorded video
  (`RecordedVideoService.probe`, `--skip-download`, prints `is_live duration id`). Longer than the policy cap →
  `LIVE_RECORDED_TOO_LONG`. A recorded stream is scoped `PRIVATE:<userId>` (its play-along position is the viewer's
  own) and has no live chat.
- **Worker:** `RecordedChunkSource` downloads the video once with yt-dlp into the run's temp dir (same flags as the
  probe, `!is_live & duration<=?43200`, 1.5 GB cap, 15 min, the printed path must lie inside the dir), then cuts 6 s
  chunks as the play-along clock reaches them (16 kHz mono, ffmpeg on the local file only) plus one frame per poll
  for vision. Nothing advances while no viewer of the run is ACTIVE or GRACE (`hasBillableSession`): a viewer waiting
  for credits gets no free transcription and the clock resumes where it paused.
- **One-click summary** (migration `20261124130000_live_video_summary`, additive): `POST /live/sessions` with
  `summarize: true` (RECORDED only, else `LIVE_SUMMARY_NEEDS_RECORDED`) uses the scope `SUMMARY:<userId>`, so it is
  its own run apart from play-along. The run reads 30 s pieces as fast as transcription allows (2 per poll) on media
  time from the run's start (`mediaStartAt` in the create answer; the page shows `m:ss` offsets and reveals the whole
  report at once). The worker records `LiveProcessingRun.processedMediaSeconds`; a summary session's heartbeat accrues
  exactly the new processed seconds (`summaryMediaAccrual`, fenced on `accruedMediaSeconds`) and never wall time. The
  page shows the estimate first (`liveSummaryEstimate`: minutes, free minutes left, paid minutes) and, when minutes
  are paid, approves them together with the confirmation.
- **Platforms.** 24 host-matched platforms (`VIDEO_PLATFORM_HOSTS`: the path is the id, query params only when they
  identify the video, plain id characters only, never escaped because yt-dlp matches Odysee's `@a:1/b:2` and Weibo's
  `fid=1:2` literally). Facebook share links are followed ONE redirect through the SSRF guard on `facebook.com`
  (`ShareLinkService`, client name `ClawAI-LinkCheck/1.0`: with no name Facebook answers `/unsupportedbrowser`).
  Facebook `reel/<id>` and `<page>/videos/<slug>/<id>`, Instagram `reel|reels|p|tv/<code>` (official embed), TikTok
  `@user/video/<id>` (embed) and `vt.`/`vm.`/`t/` share links, Twitch `videos/<id>` (player) and clips, and Kick
  `<user>/videos/<uuid>` (was silently read as the live channel) are recognised. Frontend frame allowlist adds
  `www.instagram.com`, `www.tiktok.com`, `www.dailymotion.com`, `player.vimeo.com`.
- **Bug found while testing:** server pull of a YouTube news channel failed because its master playlist (12 h rewind)
  measured 1.04 MB against a 1 MB cap. `HLS_PLAYLIST_MAX_BYTES` is now 4 MB. This also fixes production.
- **Billing bug found and fixed before shipping:** a summary heartbeat with no new progress fell through to wall-clock
  accrual (60 s video billed 60 + 16 pending); summary sessions now never accrue wall time.
- **Policy upgrade:** the seeder (runs on every prod start) adds, once, a new active policy version with the 24
  platforms appended to `serverPullPlatforms` and `recordedVideoMaxSeconds: 10800`, only while the active config has
  no `recordedVideoMaxSeconds` (an administrator's later choices are never overwritten). Dev: version 12.
- **Verified 2026-11-24/25 locally** (`scripts/qa/live-platform-sweep.mjs`, `live-summary-run.mjs`,
  `live-language-matrix.mjs`): RECORDED for the owner's two Facebook links, the Instagram reel, the TikTok link,
  YouTube, Dailymotion, Streamable, Rutube, OK.ru, VK, Odysee, Mixcloud, Niconico, Weibo, Rumble; SERVER_PULL for a
  live YouTube news channel; `LIVE_RECORDED_TOO_LONG` for a 10 h video; Discord refused. Summary: 60 s TikTok in 27 s,
  5 min Facebook video in 47 s (7/7, offsets 0,30,60…, 323 s billed for 325 s). Play-along: recorded Facebook reel
  and live channel 14/14 with every caption, card and highlight translated for an English viewer.
- **Failed real tests, not claimed publicly (still recognised, fall back to link-out):** Vimeo (every video needs a
  login now), Reddit and Douyin (need cookies; we pass none), Naver TV and TwitCasting past broadcasts (extractor
  errors in yt-dlp 2026.10.26). Rumble answered 403 to repeated hits (anti-bot) and is flaky. Live-only link shapes
  (BIGO, LinkedIn, Telegram, CHZZK, SOOP, Nimo, Bilibili live, SHOWROOM, 17LIVE, Huya, Douyu, Picarto, Trovo, DLive)
  were not tested live today (no known live channel); they use the same yt-dlp path that passed for the others.
- **Not done / honest gaps:** a summary needs the page open (heartbeats bill it; closing the tab stops the run and
  bills only what was processed); the speaker's "ClawAI" is sometimes transcribed "Kloe AI"; YouTube `@handle` links
  are still refused.
